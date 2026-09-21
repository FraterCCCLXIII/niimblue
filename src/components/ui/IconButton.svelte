<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$/utils/cn";

  interface Props {
    href?: string;
    class?: string;
    title?: string;
    "aria-label"?: string;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    onclick?: (event: MouseEvent) => void;
    children?: Snippet;
  }

  let {
    href,
    class: className,
    title,
    "aria-label": ariaLabel,
    disabled = false,
    type = "button",
    onclick,
    children,
  }: Props = $props();

  const classes = $derived(
    cn(
      "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-foreground no-underline hover:bg-hover disabled:opacity-45",
      className,
    ),
  );
</script>

{#if href}
  <a {href} class={classes} {title} aria-label={ariaLabel} {onclick}>
    {@render children?.()}
  </a>
{:else}
  <button {type} class={classes} {title} aria-label={ariaLabel} {disabled} {onclick}>
    {@render children?.()}
  </button>
{/if}
