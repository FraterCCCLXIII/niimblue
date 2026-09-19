<script lang="ts">
  import { tick } from "svelte";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import TemplateLibrary from "$/components/workspace/TemplateLibrary.svelte";
  import type { LibrarySection } from "$/components/workspace/TemplateLibrary.svelte";
  import CreateLabelDialog from "$/components/workspace/CreateLabelDialog.svelte";
  import WorkspaceTabBar from "$/components/workspace/WorkspaceTabBar.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import SettingsDialog from "$/components/workspace/SettingsDialog.svelte";
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { automation } from "$/stores";
  import type { ExportedLabelTemplate, LabelProps } from "$/types";
  import { emptyLabelTemplate } from "$/utils/starter_templates";
  import { isStarterTemplate } from "$/utils/starter_templates";
  import { FileUtils } from "$/utils/file_utils";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { tr } from "$/utils/i18n";
  import { getDesktop } from "$/utils/desktop";

  interface TabState {
    id: string;
    title: string;
    sourceId?: string;
    snapshot: ExportedLabelTemplate;
    csvEnabled: boolean;
  }

  // eslint-disable-next-line no-undef
  const appCommit = __APP_COMMIT__;
  // eslint-disable-next-line no-undef
  const buildDate = __BUILD_DATE__;

  let view = $state<"library" | "editor">("library");
  let section = $state<LibrarySection>("recent");
  let tabs = $state<TabState[]>([]);
  let activeTabId = $state<string | null>(null);
  let libraryRevision = $state(0);
  let createOpen = $state(false);
  let debugStuffShow = $state(false);
  let settingsOpen = $state(false);
  let designer = $state<LabelDesigner | undefined>();

  const activeTab = $derived(tabs.find((tab) => tab.id === activeTabId));

  const newTabId = () => `tab_${FileUtils.timestamp()}_${Math.random().toString(36).slice(2, 7)}`;

  const snapshotDesigner = () => {
    if (!designer || !activeTabId) {
      return;
    }
    const snapshot = designer.getSnapshot();
    tabs = tabs.map((tab) =>
      tab.id === activeTabId
        ? {
            ...tab,
            title: snapshot.title || tab.title,
            snapshot,
            csvEnabled: designer!.getCsvEnabled(),
            sourceId: snapshot.id?.startsWith("saved_label") ? snapshot.id : tab.sourceId,
          }
        : tab,
    );
  };

  const showLibrary = () => {
    snapshotDesigner();
    view = "library";
    libraryRevision += 1;
  };

  const showEditor = async (tabId: string) => {
    activeTabId = tabId;
    view = "editor";
    await tick();
    const tab = tabs.find((item) => item.id === tabId);
    if (tab && designer) {
      await designer.applyLabel(tab.snapshot, tab.csvEnabled);
    }
  };

  const openLabel = async (label: ExportedLabelTemplate) => {
    snapshotDesigner();
    const cloned = structuredClone(label);
    if (isStarterTemplate(cloned.id)) {
      cloned.id = undefined;
    }
    const existing = cloned.id ? tabs.find((tab) => tab.sourceId === cloned.id) : undefined;
    if (existing) {
      await showEditor(existing.id);
      return;
    }
    const id = newTabId();
    tabs = [
      ...tabs,
      {
        id,
        title: cloned.title || $tr("editor.untitled"),
        sourceId: cloned.id,
        snapshot: cloned,
        csvEnabled: !!cloned.csv,
      },
    ];
    if (cloned.id) {
      LocalStoragePersistence.touchRecentLabel(cloned.id);
    }
    await showEditor(id);
  };

  const createLabel = async (label: LabelProps, title: string) => {
    createOpen = false;
    await openLabel(emptyLabelTemplate(label, title));
  };

  const closeTab = async (id: string) => {
    const closingActive = id === activeTabId;
    if (closingActive) {
      snapshotDesigner();
    }
    const index = tabs.findIndex((tab) => tab.id === id);
    tabs = tabs.filter((tab) => tab.id !== id);
    if (!closingActive) {
      return;
    }
    const next = tabs[index] ?? tabs[index - 1];
    if (next) {
      await showEditor(next.id);
    } else {
      activeTabId = null;
      view = "library";
    }
  };

  const onSaved = () => {
    libraryRevision += 1;
    if (activeTab && designer) {
      const snapshot = designer.getSnapshot();
      tabs = tabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, title: snapshot.title || tab.title, snapshot, sourceId: snapshot.id ?? tab.sourceId }
          : tab,
      );
      if (snapshot.id) {
        LocalStoragePersistence.touchRecentLabel(snapshot.id);
      }
    }
  };

  $effect(() => {
    if ($automation?.startPrint && tabs.length === 0) {
      view = "editor";
    }
  });

  $effect(() => {
    const desktop = getDesktop();
    document.documentElement.classList.toggle("is-desktop-window", !!desktop);
    if (desktop) {
      document.documentElement.dataset.platform = desktop.platform;
    }
  });
</script>

<div class="workspace" data-bs-theme="light">
  <WorkspaceTabBar
    tabs={tabs.map((tab) => ({ id: tab.id, title: tab.title }))}
    {activeTabId}
    showHome={view === "library"}
    onHome={showLibrary}
    onSelect={(id) => showEditor(id)}
    onClose={closeTab}
    onCreate={() => (createOpen = true)}>
    <PrinterConnector />
    <button type="button" class="workspace-icon-btn" title={$tr("settings.title")} onclick={() => (settingsOpen = true)}>
      <MdIcon icon="settings" />
    </button>
  </WorkspaceTabBar>

  <div class="px-3">
    <BrowserWarning />
  </div>

  <div class="workspace-body">
    <div class="workspace-panel" class:is-hidden={view !== "library"}>
      <TemplateLibrary
        {section}
        revision={libraryRevision}
        onSectionChange={(next) => (section = next)}
        onCreate={() => (createOpen = true)}
        onOpen={openLabel} />
    </div>
    <div class="workspace-panel" class:is-hidden={view !== "editor"}>
      <LabelDesigner bind:this={designer} autoLoad={false} onSaved={onSaved} onUrlLoaded={openLabel} />
    </div>
  </div>

  <CreateLabelDialog bind:show={createOpen} onCreate={createLabel} />
  <SettingsDialog
    bind:show={settingsOpen}
    commit={appCommit}
    {buildDate}
    onDebug={() => {
      settingsOpen = false;
      debugStuffShow = true;
    }} />

  {#if debugStuffShow}
    <DebugStuff bind:show={debugStuffShow} />
  {/if}
</div>
