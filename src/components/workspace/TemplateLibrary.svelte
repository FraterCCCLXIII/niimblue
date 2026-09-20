<script lang="ts">
  import type { ExportedLabelTemplate, PrintHistoryEntry } from "$/types";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { getStarterTemplates } from "$/utils/starter_templates";
  import { formatLabelSize } from "$/utils/label_geometry";
  import { cloneLabelTemplate } from "$/utils/label_template";
  import { isStarterTemplate } from "$/utils/starter_templates";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import TemplateCard from "$/components/workspace/TemplateCard.svelte";
  import RenameLabelDialog from "$/components/workspace/RenameLabelDialog.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import { libraryHref, type LibrarySection } from "$/utils/app_router";

  export type { LibrarySection };

  interface Props {
    section: LibrarySection;
    revision: number;
    onSectionChange: (section: LibrarySection) => void;
    onCreate: () => void;
    openTemplate: (label: ExportedLabelTemplate, options?: { print?: boolean }) => void;
    onLabelRenamed?: (id: string, title: string) => void;
  }

  let { section, revision, onSectionChange, onCreate, openTemplate, onLabelRenamed }: Props = $props();

  let savedLabels = $state.raw<ExportedLabelTemplate[]>([]);
  let history = $state.raw<PrintHistoryEntry[]>([]);
  let printCounts = $state<Record<string, number>>({});
  let starters = getStarterTemplates();
  let renameOpen = $state(false);
  let renaming = $state<ExportedLabelTemplate | undefined>(undefined);

  const refresh = () => {
    savedLabels = LocalStoragePersistence.loadLabels();
    history = LocalStoragePersistence.loadPrintHistory();
    printCounts = LocalStoragePersistence.loadPrintCounts();
  };

  $effect(() => {
    void revision;
    refresh();
  });

  const recentLabels = $derived.by(() => {
    const recentIds = LocalStoragePersistence.loadRecentLabels().map((item) => item.id);
    const byId = new Map(savedLabels.map((label) => [label.id, label]));
    const ordered = recentIds.map((id) => byId.get(id)).filter((label): label is ExportedLabelTemplate => !!label);
    if (ordered.length > 0) {
      return ordered;
    }
    return [...savedLabels].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  });

  const visibleLabels = $derived(
    section === "mine" ? savedLabels : section === "catalog" ? starters : recentLabels,
  );

  const heading = $derived(
    section === "mine"
      ? $tr("library.my_templates")
      : section === "history"
        ? $tr("library.print_history")
        : section === "catalog"
          ? $tr("library.catalog")
          : $tr("library.recent"),
  );

  const emptyText = $derived(
    section === "mine"
      ? $tr("library.empty.mine")
      : section === "history"
        ? $tr("library.empty.history")
        : section === "catalog"
          ? $tr("library.empty.catalog")
          : $tr("library.empty.recent"),
  );

  const selectLabel = (label: ExportedLabelTemplate, options?: { print?: boolean }) => {
    openTemplate(cloneLabelTemplate(label), options);
  };

  const exportLabel = (label: ExportedLabelTemplate) => {
    FileUtils.saveLabelAsJson(cloneLabelTemplate(label));
  };

  const canDeleteLabel = (label: ExportedLabelTemplate) => !!label.id && !isStarterTemplate(label.id);
  const canRenameLabel = (label: ExportedLabelTemplate) => canDeleteLabel(label);

  const openRename = (label: ExportedLabelTemplate) => {
    if (!canRenameLabel(label)) {
      return;
    }
    renaming = label;
    renameOpen = true;
  };

  const applyRename = (title: string) => {
    const current = renaming;
    const id = current?.id;
    if (!current || !id || !canRenameLabel(current)) {
      return;
    }
    if (!LocalStoragePersistence.renameLabel(id, title)) {
      return;
    }
    onLabelRenamed?.(id, title);
    refresh();
  };

  const duplicateLabel = (label: ExportedLabelTemplate) => {
    const cloned = cloneLabelTemplate(label);
    cloned.id = undefined;
    cloned.timestamp = FileUtils.timestamp();
    cloned.title = `${cloned.title || $tr("editor.untitled")} copy`;
    const next = [...LocalStoragePersistence.loadLabels(), cloned];
    LocalStoragePersistence.saveLabels(next);
    refresh();
  };

  const deleteLabel = (label: ExportedLabelTemplate) => {
    if (!canDeleteLabel(label)) {
      return;
    }
    const next = savedLabels.filter((item) => item.id !== label.id);
    LocalStoragePersistence.saveLabels(next);
    refresh();
  };

  const openHistory = (entry: PrintHistoryEntry) => {
    if (!entry.sourceId) {
      return;
    }
    const match = savedLabels.find((label) => label.id === entry.sourceId);
    if (match) {
      selectLabel(match);
    }
  };
</script>

<div class="library">
  <aside class="library-nav">
    <button type="button" class="ws-btn ws-btn-primary mb-3" onclick={onCreate}>
      <MdIcon icon="add" />
      {$tr("library.create")}
    </button>
    <a class="library-nav__item" class:is-active={section === "recent"} href={libraryHref("recent")}>
      <MdIcon icon="schedule" />
      {$tr("library.recent")}
    </a>
    <a class="library-nav__item" class:is-active={section === "mine"} href={libraryHref("mine")}>
      <MdIcon icon="folder" />
      {$tr("library.my_templates")}
    </a>
    <a class="library-nav__item" class:is-active={section === "history"} href={libraryHref("history")}>
      <MdIcon icon="history" />
      {$tr("library.print_history")}
    </a>
    <a class="library-nav__item" class:is-active={section === "catalog"} href={libraryHref("catalog")}>
      <MdIcon icon="widgets" />
      {$tr("library.catalog")}
    </a>
  </aside>

  <CustomScroll class="library-main">
    <h2>{heading}</h2>

    {#if section === "history"}
      {#if history.length === 0}
        <div class="library-empty">{emptyText}</div>
      {:else}
        <div class="template-grid">
          {#each history as entry (entry.id)}
            <button type="button" class="template-card" onclick={() => openHistory(entry)}>
              <div class="template-card__preview">
                {#if entry.thumbnailBase64}
                  <img src={entry.thumbnailBase64} alt="" />
                {/if}
              </div>
              <div class="template-card__meta">
                <div>
                  <div class="template-card__title">{entry.title}</div>
                  <div class="template-card__size">
                    {formatLabelSize({ printDirection: "left", size: entry.size })}
                  </div>
                </div>
                <div class="template-card__prints">
                  {entry.copies}
                  {$tr("library.copies")}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    {:else if visibleLabels.length === 0 && section === "recent"}
      <div class="template-grid">
        {#each starters as label (label.id)}
          <TemplateCard
            {label}
            onSelect={() => selectLabel(label)}
            onDuplicate={() => duplicateLabel(label)}
            onExport={() => exportLabel(label)}
            onPrint={() => selectLabel(label, { print: true })} />
        {/each}
      </div>
    {:else if visibleLabels.length === 0}
      <div class="library-empty">{emptyText}</div>
    {:else}
      <div class="template-grid">
        {#each visibleLabels as label, index (label.id ?? `${label.title}-${index}`)}
          <TemplateCard
            {label}
            printCount={label.id ? printCounts[label.id] ?? 0 : 0}
            onSelect={() => selectLabel(label)}
            onRename={canRenameLabel(label) ? () => openRename(label) : undefined}
            onDuplicate={() => duplicateLabel(label)}
            onDelete={canDeleteLabel(label) ? () => deleteLabel(label) : undefined}
            onExport={() => exportLabel(label)}
            onPrint={() => selectLabel(label, { print: true })} />
        {/each}
      </div>
    {/if}
  </CustomScroll>

  <RenameLabelDialog
    bind:show={renameOpen}
    value={renaming?.title?.trim() || $tr("editor.untitled")}
    onRename={applyRename} />
</div>
