<script lang="ts">
  import Modal from "bootstrap/js/dist/modal";
  import { onDestroy, onMount, type Snippet } from "svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";

  interface Props {
    show: boolean;
    title: string;
    size?: "md" | "lg" | "xl";
    scroll?: boolean;
    stack?: boolean;
    onClose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { show = $bindable(), title, size = "md", scroll = true, stack = false, onClose, children, footer }: Props = $props();

  let modalEl: HTMLElement;
  let modal: Modal;

  onMount(() => {
    modal = new Modal(modalEl);
    modal.show();

    modalEl.addEventListener('hide.bs.modal', () => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });

    modalEl.addEventListener("hidden.bs.modal", () => {
      if (onClose) onClose();
      show = false;
    });

  });

  onDestroy(() => {
    if (modal) {
      modal.hide();
      modal.dispose();
    }
  });

  export const hide = () => {
    if (modal) {
      modal.hide();
    }
  };
</script>

<div
  bind:this={modalEl}
  class="modal fade workspace-modal"
  class:workspace-modal--wide={size === "lg" || size === "xl"}
  class:workspace-modal--stack={stack}
  data-bs-theme="light"
  tabindex="-1"
  aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" class:modal-lg={size === "lg"} class:modal-xl={size === "xl"}>
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title">{title}</h1>
        <button aria-label="Dismiss" type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <div class="modal-body">
        {#if scroll}
          <CustomScroll class="workspace-modal__scroll">
            {@render children()}
          </CustomScroll>
        {:else}
          {@render children()}
        {/if}
      </div>

      {#if footer}
        <div class="modal-footer">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
</div>
