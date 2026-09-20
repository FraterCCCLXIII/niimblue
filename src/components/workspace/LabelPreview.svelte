<script lang="ts">
  import type { ExportedLabelTemplate } from "$/types";
  import { renderLabelPreviewImage } from "$/utils/label_preview";

  interface Props {
    label: ExportedLabelTemplate;
  }

  let { label }: Props = $props();

  const canvasWidth = $derived(Math.max(label.label.size.width, 1));
  const canvasHeight = $derived(Math.max(label.label.size.height, 1));
  const rounded = $derived(label.label.shape === "rounded_rect" || label.label.shape === "circle");

  let src = $state<string | undefined>(label.thumbnailBase64);

  $effect(() => {
    const current = label;
    let cancelled = false;

    if (current.thumbnailBase64) {
      src = current.thumbnailBase64;
      return;
    }

    src = undefined;
    renderLabelPreviewImage(current)
      .then((url) => {
        if (!cancelled) {
          src = url;
        }
      })
      .catch(() => {
        if (!cancelled) {
          src = undefined;
        }
      });

    return () => {
      cancelled = true;
    };
  });
</script>

<div
  class="label-preview"
  class:is-rounded={rounded}
  style={`aspect-ratio: ${canvasWidth} / ${canvasHeight}`}>
  {#if src}
    <img src={src} alt="" />
  {/if}
</div>

<style>
  .label-preview {
    width: auto;
    height: auto;
    max-width: calc(100% - 20px);
    max-height: calc(100% - 20px);
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(17, 17, 17, 0.08);
    overflow: hidden;
  }

  .label-preview.is-rounded {
    border-radius: 10px;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    max-height: none;
    object-fit: contain;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
  }
</style>
