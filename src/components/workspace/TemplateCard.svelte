<script lang="ts">
  import type { ExportedLabelTemplate } from "$/types";
  import { formatLabelSize } from "$/utils/label_geometry";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import LabelPreview from "$/components/workspace/LabelPreview.svelte";
  import { fixedDropdown } from "$/utils/fixed_dropdown";
  import Dropdown from "bootstrap/js/dist/dropdown";

  interface Props {
    label: ExportedLabelTemplate;
    printCount?: number;
    lastQuantity?: number;
    onSelect?: () => void;
    onRename?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onExport?: () => void;
    onPrint?: () => void;
  }

  let { label, printCount = 0, lastQuantity = 0, onSelect, onRename, onDuplicate, onDelete, onExport, onPrint }: Props = $props();

  let moreBtn: HTMLButtonElement | undefined = $state();

  const showCardMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!moreBtn) {
      return;
    }
    Dropdown.getInstance(moreBtn)?.show();
  };

  const onCardClick = (event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      showCardMenu(event);
      return;
    }
    onSelect?.();
  };
</script>

<div class="template-card-wrap">
  <div class="template-card">
    <button type="button" class="template-card__hit" onclick={onCardClick} oncontextmenu={showCardMenu}>
      <div class="template-card__preview">
        <LabelPreview {label} />
      </div>
      <div class="template-card__meta">
        <div class="min-w-0">
          <div class="template-card__title">{label.title ?? $tr("editor.untitled")}</div>
          <div class="template-card__size">{formatLabelSize(label.label)}</div>
        </div>
        {#if printCount > 0}
          <span class="template-card__prints">
            <MdIcon icon="description" />
            {printCount}{lastQuantity > 0 ? `/${lastQuantity}` : ""}
          </span>
        {/if}
      </div>
    </button>

    <div class="dropdown template-card__more">
      <button
        type="button"
        bind:this={moreBtn}
        class="template-card__more-btn"
        data-bs-toggle="dropdown"
        data-bs-auto-close="true"
        use:fixedDropdown
        title={$tr("editor.more")}
        aria-label={$tr("editor.more")}
        onclick={(event) => event.stopPropagation()}>
        <MdIcon icon="more_horiz" />
      </button>
      <div class="dropdown-menu dropdown-menu-end">
        <button type="button" class="dropdown-item" onclick={() => onSelect?.()}>
          {$tr("library.open")}
        </button>
        {#if onRename}
          <button type="button" class="dropdown-item" onclick={() => onRename()}>
            {$tr("library.rename")}
          </button>
        {/if}
        {#if onDuplicate}
          <button type="button" class="dropdown-item" onclick={() => onDuplicate()}>
            {$tr("library.duplicate")}
          </button>
        {/if}
        {#if onExport}
          <button type="button" class="dropdown-item" onclick={() => onExport()}>
            {$tr("editor.export")}
          </button>
        {/if}
        {#if onPrint}
          <button type="button" class="dropdown-item" onclick={() => onPrint()}>
            {$tr("editor.print")}
          </button>
        {/if}
        {#if onDelete}
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item text-danger" onclick={() => onDelete()}>
            {$tr("library.delete")}
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .min-w-0 {
    min-width: 0;
  }

  .template-card-wrap {
    position: relative;
    width: 220px;
    min-width: 220px;
    max-width: 220px;
  }

  .template-card {
    position: relative;
  }

  .template-card__hit {
    appearance: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .template-card__more {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
  }

  .template-card__more-btn {
    appearance: none;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: #6a6a6a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 4px rgba(17, 17, 17, 0.08);
  }

  .template-card__more-btn:hover {
    background: #fff;
    color: var(--ws-text);
  }
</style>
