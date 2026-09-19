<script lang="ts">
  import type { ExportedLabelTemplate } from "$/types";
  import { formatLabelSize } from "$/utils/label_geometry";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import LabelPreview from "$/components/workspace/LabelPreview.svelte";

  interface Props {
    label: ExportedLabelTemplate;
    printCount?: number;
    lastQuantity?: number;
    onOpen: () => void;
    onDelete?: () => void;
  }

  let { label, printCount = 0, lastQuantity = 0, onOpen, onDelete }: Props = $props();
</script>

<button type="button" class="template-card" onclick={onOpen}>
  <div class="template-card__preview">
    {#if label.thumbnailBase64}
      <img src={label.thumbnailBase64} alt="" />
    {:else}
      <LabelPreview {label} />
    {/if}
  </div>
  <div class="template-card__meta">
    <div class="min-w-0">
      <div class="template-card__title">{label.title ?? $tr("editor.untitled")}</div>
      <div class="template-card__size">{formatLabelSize(label.label)}</div>
    </div>
    <div class="d-flex align-items-center gap-2">
      {#if printCount > 0}
        <span class="template-card__prints">
          <MdIcon icon="description" />
          {printCount}{lastQuantity > 0 ? `/${lastQuantity}` : ""}
        </span>
      {/if}
      {#if onDelete}
        <span
          class="workspace-icon-btn"
          role="button"
          tabindex="0"
          onclick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onDelete();
            }
          }}>
          <MdIcon icon="delete" />
        </span>
      {/if}
    </div>
  </div>
</button>

<style>
  .min-w-0 {
    min-width: 0;
  }
</style>
