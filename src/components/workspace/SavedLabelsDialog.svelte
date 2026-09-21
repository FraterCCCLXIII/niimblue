<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Button } from "$/components/ui";
  import LabelPreview from "$/components/workspace/LabelPreview.svelte";
  import { ExportedLabelTemplateSchema, type ExportedLabelTemplate } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { formatLabelSize } from "$/utils/label_geometry";
  import { tr } from "$/utils/i18n";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { untrack } from "svelte";
  import { Utils } from "@mmote/niimbluelib";

  interface Props {
    show: boolean;
    canUseCurrent?: boolean;
    csvEnabled?: boolean;
    onRequestLabelTemplate: () => ExportedLabelTemplate;
    onLoadRequested: (label: ExportedLabelTemplate) => void;
    onExportPng?: () => void;
    onChanged?: () => void;
  }

  let {
    show = $bindable(),
    canUseCurrent = false,
    csvEnabled = false,
    onRequestLabelTemplate,
    onLoadRequested,
    onExportPng,
    onChanged,
  }: Props = $props();

  let savedLabels = $state<ExportedLabelTemplate[]>([]);
  let selectedIndex = $state(-1);
  let title = $state("");
  let usedSpace = $state(0);
  let customDefaultTemplate = $state(LocalStoragePersistence.hasCustomDefaultTemplate());
  const isStandalone = Utils.getAvailableTransports().capacitorBle;

  const selectedLabel = $derived(selectedIndex >= 0 ? savedLabels[selectedIndex] : undefined);

  const refresh = () => {
    savedLabels = LocalStoragePersistence.loadLabels();
    usedSpace = LocalStoragePersistence.usedSpace();
    customDefaultTemplate = LocalStoragePersistence.hasCustomDefaultTemplate();
  };

  const currentLabel = (assignTitle = true): ExportedLabelTemplate | undefined => {
    if (!canUseCurrent) {
      return undefined;
    }
    try {
      const label = onRequestLabelTemplate();
      if (assignTitle) {
        label.title = title;
      }
      return label;
    } catch (error) {
      Toasts.error(error);
      return undefined;
    }
  };

  const persistLabels = (labels: ExportedLabelTemplate[]) => {
    const { zodErrors, otherErrors } = LocalStoragePersistence.saveLabels(labels);
    zodErrors.forEach((error) => Toasts.zodErrors(error, "Label save error"));
    otherErrors.forEach((error) => Toasts.error(error));
    if (zodErrors.length === 0 && otherErrors.length === 0) {
      savedLabels = labels;
      onChanged?.();
    }
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const onSelect = (index: number) => {
    selectedIndex = index;
    title = savedLabels[index]?.title ?? "";
  };

  const onExportItem = (index: number) => {
    try {
      FileUtils.saveLabelAsJson(savedLabels[index]);
    } catch (error) {
      Toasts.zodErrors(error, "Canvas save error:");
    }
  };

  const onDeleteItem = (index: number) => {
    if (!confirm($tr("editor.delete.confirm"))) {
      return;
    }
    const next = [...savedLabels];
    next.splice(index, 1);
    persistLabels(next);
    selectedIndex = -1;
    title = "";
  };

  const onSave = () => {
    const label = currentLabel();
    if (!label) {
      return;
    }
    persistLabels([...savedLabels, label]);
  };

  const onReplace = () => {
    if (selectedIndex < 0) {
      return;
    }
    if (!confirm($tr("editor.warning.save"))) {
      return;
    }
    const label = currentLabel();
    if (!label) {
      return;
    }
    const next = [...savedLabels];
    next[selectedIndex] = label;
    persistLabels(next);
  };

  const onLoad = () => {
    if (!selectedLabel) {
      return;
    }
    let message = $tr("editor.warning.load");
    if (selectedLabel.csv) {
      message += "\n" + $tr("editor.warning.load.csv");
    }
    if (!confirm(message)) {
      return;
    }
    onLoadRequested(selectedLabel);
    show = false;
  };

  const onImport = async () => {
    try {
      const contents = await FileUtils.pickAndReadSingleTextFile("json");
      const label = ExportedLabelTemplateSchema.parse(JSON.parse(contents));
      let message = $tr("editor.warning.load");
      if (label.csv) {
        message += "\n" + $tr("editor.warning.load.csv");
      }
      if (!confirm(message)) {
        return;
      }
      if (label.title) {
        title = label.title;
      }
      onLoadRequested(label);
      show = false;
    } catch (error) {
      Toasts.zodErrors(error, "Canvas load error:");
    }
  };

  const onExport = () => {
    const label = currentLabel();
    if (!label) {
      return;
    }
    try {
      if (title) {
        label.title = title.replaceAll(/[\\/:*?"<>|]/g, "_");
      }
      FileUtils.saveLabelAsJson(label);
    } catch (error) {
      Toasts.zodErrors(error, "Canvas save error:");
    }
  };

  const onCopyLink = async () => {
    const label = currentLabel();
    if (!label) {
      return;
    }
    try {
      const url = await FileUtils.makeLabelUrl(label);
      if (url.length > 2000 && !confirm($tr("params.saved_labels.save.url.warn"))) {
        return;
      }
      await navigator.clipboard.writeText(url);
      Toasts.message($tr("params.saved_labels.save.url.copied"));
    } catch (error) {
      Toasts.error(error);
    }
  };

  const onMakeDefault = () => {
    const label = currentLabel();
    if (!label) {
      return;
    }
    label.thumbnailBase64 = undefined;
    LocalStoragePersistence.saveDefaultTemplate(label);
    customDefaultTemplate = true;
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  const onRemoveDefault = () => {
    LocalStoragePersistence.saveDefaultTemplate(undefined);
    customDefaultTemplate = false;
    usedSpace = LocalStoragePersistence.usedSpace();
  };

  $effect(() => {
    if (!show) {
      return;
    }
    untrack(() => {
      refresh();
      selectedIndex = -1;
      title = "";
      if (canUseCurrent) {
        try {
          title = onRequestLabelTemplate().title ?? "";
        } catch {
          title = "";
        }
      }
    });
  });
</script>

{#if show}
  <AppModal bind:show title={$tr("params.saved_labels.dialog_title")}>
    <p class="ws-help">
      {usedSpace}
      {$tr("params.saved_labels.kb_used")}
    </p>

    {#if csvEnabled && canUseCurrent}
      <p class="ws-help saved-csv">{$tr("params.saved_labels.save.withcsv")}</p>
    {/if}

    <div class="saved-actions">
      <Button onclick={() => void onImport()}>
        <MdIcon icon="upload" />
        {$tr("params.saved_labels.load.json")}
      </Button>
      <Button disabled={!canUseCurrent} onclick={onExport}>
        <MdIcon icon="download" />
        {$tr("params.saved_labels.save.json")}
      </Button>
      {#if onExportPng}
        <Button disabled={!canUseCurrent} onclick={onExportPng}>PNG</Button>
      {/if}
      {#if !isStandalone}
        <Button disabled={!canUseCurrent} onclick={() => void onCopyLink()}>
          {$tr("params.saved_labels.save.url")}
        </Button>
      {/if}
    </div>

    <div class="saved-list" role="list">
      {#each savedLabels as item, idx (item.id ?? item.timestamp)}
        <div class="saved-item" class:is-active={selectedIndex === idx} role="listitem">
          <button type="button" class="saved-item__hit" onclick={() => onSelect(idx)}>
            <div class="saved-item__preview">
              <LabelPreview label={item} />
            </div>
            <div class="saved-item__meta">
              <strong>{item.title || $tr("editor.untitled")}</strong>
              <span>{formatLabelSize(item.label)}</span>
            </div>
          </button>
          <div class="saved-item__actions">
            <button
              type="button"
              class="workspace-icon-btn"
              title={$tr("params.saved_labels.save.json")}
              onclick={() => onExportItem(idx)}>
              <MdIcon icon="download" />
            </button>
            <button
              type="button"
              class="workspace-icon-btn saved-item__delete"
              title={$tr("library.delete")}
              onclick={() => onDeleteItem(idx)}>
              <MdIcon icon="delete" />
            </button>
          </div>
        </div>
      {:else}
        <p class="ws-help">{$tr("library.empty.mine")}</p>
      {/each}
    </div>

    {#snippet footer()}
      <label class="saved-title">
        <span>{$tr("params.saved_labels.label_title")}</span>
        <input
          class="insp-field"
          type="text"
          placeholder={$tr("params.saved_labels.label_title.placeholder")}
          bind:value={title} />
      </label>
      <div class="saved-footer">
        <div class="saved-footer__start">
          <Button disabled={!canUseCurrent} onclick={onMakeDefault}>
            {$tr("params.saved_labels.make_default")}
          </Button>
          {#if customDefaultTemplate}
            <button
              type="button"
              class="workspace-icon-btn"
              title={$tr("params.saved_labels.remove_default")}
              onclick={onRemoveDefault}>
              <MdIcon icon="close" />
            </button>
          {/if}
        </div>
        <div class="saved-footer__end">
          <Button disabled={!canUseCurrent} onclick={onSave}>
            {$tr("params.saved_labels.save.browser")}
          </Button>
          {#if selectedLabel}
            <Button disabled={!canUseCurrent} onclick={onReplace}>
              {$tr("params.saved_labels.save.browser.replace")}
            </Button>
            <Button variant="primary" onclick={onLoad}>
              {$tr("params.saved_labels.load.browser")}
            </Button>
          {/if}
        </div>
      </div>
    {/snippet}
  </AppModal>
{/if}

<style>
  .saved-csv {
    color: #b45309;
  }

  .saved-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0 0 16px;
  }

  .saved-list {
    display: grid;
    gap: 8px;
  }

  .saved-item {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--ws-line);
    border-radius: 10px;
    background: var(--ws-surface);
    padding-right: 6px;
  }

  .saved-item.is-active {
    border-color: var(--ws-accent);
    background: var(--ws-active);
  }

  .saved-item__hit {
    appearance: none;
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 8px 8px 8px;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .saved-item__preview {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ws-canvas);
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .saved-item__meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .saved-item__meta strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
  }

  .saved-item__meta span {
    color: var(--ws-muted);
    font-size: 12px;
  }

  .saved-item__actions {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .saved-item__delete {
    color: #b42318;
  }

  .saved-title {
    display: grid;
    gap: 6px;
    width: 100%;
    margin-bottom: 4px;
    color: var(--ws-muted);
    font-size: 13px;
  }

  .saved-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
  }

  .saved-footer__start,
  .saved-footer__end {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
</style>
