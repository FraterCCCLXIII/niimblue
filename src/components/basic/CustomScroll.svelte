<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    class?: string;
    axis?: "x" | "y" | "both";
    role?: string;
    view?: HTMLElement;
    children: Snippet;
  }

  let { class: className = "", axis = "y", role, view = $bindable(), children }: Props = $props();

  let showX = $state(false);
  let showY = $state(false);
  let thumbX = $state({ size: 0, offset: 0 });
  let thumbY = $state({ size: 0, offset: 0 });
  let scrolling = $state(false);
  let scrollHide: number | undefined;

  const canX = $derived(axis === "x" || axis === "both");
  const canY = $derived(axis === "y" || axis === "both");

  const sync = () => {
    if (!view) {
      return;
    }
    const { clientWidth, clientHeight, scrollWidth, scrollHeight, scrollLeft, scrollTop } = view;
    showX = canX && scrollWidth - clientWidth > 2;
    showY = canY && scrollHeight - clientHeight > 2;
    const xTrack = Math.max(clientWidth - (showY ? 10 : 0), 1);
    const yTrack = Math.max(clientHeight - (showX ? 10 : 0), 1);
    thumbX = {
      size: Math.max(24, (clientWidth / scrollWidth) * xTrack),
      offset: scrollWidth > clientWidth ? (scrollLeft / (scrollWidth - clientWidth)) * (xTrack - Math.max(24, (clientWidth / scrollWidth) * xTrack)) : 0,
    };
    thumbY = {
      size: Math.max(24, (clientHeight / scrollHeight) * yTrack),
      offset: scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * (yTrack - Math.max(24, (clientHeight / scrollHeight) * yTrack)) : 0,
    };
  };

  const markScrolling = () => {
    scrolling = true;
    if (scrollHide) {
      clearTimeout(scrollHide);
    }
    scrollHide = window.setTimeout(() => {
      scrolling = false;
    }, 700);
  };

  const onScroll = () => {
    sync();
    markScrolling();
  };

  const startDrag = (event: PointerEvent, direction: "x" | "y") => {
    if (!view) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const start = direction === "y" ? event.clientY : event.clientX;
    const startScroll = direction === "y" ? view.scrollTop : view.scrollLeft;
    const thumb = direction === "y" ? thumbY.size : thumbX.size;
    const track = direction === "y" ? view.clientHeight : view.clientWidth;
    const range = direction === "y" ? view.scrollHeight - view.clientHeight : view.scrollWidth - view.clientWidth;
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const delta = (direction === "y" ? moveEvent.clientY : moveEvent.clientX) - start;
      const next = startScroll + (delta / Math.max(track - thumb, 1)) * range;
      if (direction === "y") {
        view!.scrollTop = next;
      } else {
        view!.scrollLeft = next;
      }
    };
    const stop = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", stop);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", stop);
  };

  const jump = (event: MouseEvent, direction: "x" | "y") => {
    if (!view || (event.target as HTMLElement).closest(".ws-scroll__thumb")) {
      return;
    }
    const rail = event.currentTarget as HTMLElement;
    const rect = rail.getBoundingClientRect();
    if (direction === "y") {
      const ratio = (event.clientY - rect.top) / rect.height;
      view.scrollTop = ratio * (view.scrollHeight - view.clientHeight);
    } else {
      const ratio = (event.clientX - rect.left) / rect.width;
      view.scrollLeft = ratio * (view.scrollWidth - view.clientWidth);
    }
  };

  $effect(() => {
    if (!view) {
      return;
    }
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(view);
    if (view.firstElementChild) {
      observer.observe(view.firstElementChild);
    }
    return () => observer.disconnect();
  });
</script>

<div class="ws-scroll {className}" class:is-scrolling={scrolling} class:has-x={showX} class:has-y={showY} {role}>
  <div class="ws-scroll__view" bind:this={view} onscroll={onScroll}>
    {@render children()}
  </div>
  {#if canY}
    <div
      class="ws-scroll__rail ws-scroll__rail--y"
      class:is-visible={showY}
      onclick={(event) => jump(event, "y")}
      role="presentation">
      <div
        class="ws-scroll__thumb"
        style:height="{thumbY.size}px"
        style:transform="translateY({thumbY.offset}px)"
        onpointerdown={(event) => startDrag(event, "y")}
        role="presentation"></div>
    </div>
  {/if}
  {#if canX}
    <div
      class="ws-scroll__rail ws-scroll__rail--x"
      class:is-visible={showX}
      onclick={(event) => jump(event, "x")}
      role="presentation">
      <div
        class="ws-scroll__thumb"
        style:width="{thumbX.size}px"
        style:transform="translateX({thumbX.offset}px)"
        onpointerdown={(event) => startDrag(event, "x")}
        role="presentation"></div>
    </div>
  {/if}
</div>
