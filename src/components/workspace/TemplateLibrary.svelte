<script lang="ts">
  import type { ExportedLabelTemplate, PrintHistoryEntry } from "$/types";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { getStarterTemplates } from "$/utils/starter_templates";
  import { formatLabelSize } from "$/utils/label_geometry";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import TemplateCard from "$/components/workspace/TemplateCard.svelte";

  export type LibrarySection = "recent" | "mine" | "history" | "catalog";

  interface Props {
    section: LibrarySection;
    revision: number;
    onSectionChange: (section: LibrarySection) => void;
    onCreate: () => void;
    onOpen: (label: ExportedLabelTemplate) => void;
  }

  let { section, revision, onSectionChange, onCreate, onOpen }: Props = $props();

  let savedLabels = $state<ExportedLabelTemplate[]>([]);
  let history = $state<PrintHistoryEntry[]>([]);
  let printCounts = $state<Record<string, number>>({});
  let starters = getStarterTemplates();

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

  const deleteLabel = (index: number) => {
    const next = savedLabels.filter((_, i) => i !== index);
    LocalStoragePersistence.saveLabels(next);
    refresh();
  };

  const openHistory = (entry: PrintHistoryEntry) => {
    if (!entry.sourceId) {
      return;
    }
    const match = savedLabels.find((label) => label.id === entry.sourceId);
    if (match) {
      onOpen(match);
    }
  };
</script>

<div class="library">
  <aside class="library-nav">
    <button type="button" class="ws-btn ws-btn-primary mb-3" onclick={onCreate}>
      <MdIcon icon="add" />
      {$tr("library.create")}
    </button>
    <button
      type="button"
      class="library-nav__item"
      class:is-active={section === "recent"}
      onclick={() => onSectionChange("recent")}>
      <MdIcon icon="schedule" />
      {$tr("library.recent")}
    </button>
    <button
      type="button"
      class="library-nav__item"
      class:is-active={section === "mine"}
      onclick={() => onSectionChange("mine")}>
      <MdIcon icon="folder" />
      {$tr("library.my_templates")}
    </button>
    <button
      type="button"
      class="library-nav__item"
      class:is-active={section === "history"}
      onclick={() => onSectionChange("history")}>
      <MdIcon icon="history" />
      {$tr("library.print_history")}
    </button>
    <button
      type="button"
      class="library-nav__item"
      class:is-active={section === "catalog"}
      onclick={() => onSectionChange("catalog")}>
      <MdIcon icon="widgets" />
      {$tr("library.catalog")}
    </button>
  </aside>

  <section class="library-main">
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
          <TemplateCard {label} onOpen={() => onOpen(label)} />
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
            onOpen={() => onOpen(label)}
            onDelete={section === "mine" ? () => deleteLabel(index) : undefined} />
        {/each}
      </div>
    {/if}
  </section>
</div>
