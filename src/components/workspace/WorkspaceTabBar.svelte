<script lang="ts">
  import type { Snippet } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import WindowControls from "$/components/workspace/WindowControls.svelte";
  import { getDesktop } from "$/utils/desktop";
  import { editorHref, libraryHref, type LibrarySection } from "$/utils/app_router";
  import { tr } from "$/utils/i18n";

  export interface WorkspaceTab {
    id: string;
    title: string;
  }

  interface Props {
    tabs: WorkspaceTab[];
    activeTabId: string | null;
    librarySection?: LibrarySection;
    showHome: boolean;
    onClose: (id: string) => void;
    onCreate: () => void;
    children?: Snippet;
  }

  let { tabs, activeTabId, librarySection = "recent", showHome, onClose, onCreate, children }: Props = $props();

  const desktop = getDesktop();
  const isMacDesktop = desktop?.platform === "darwin";

  const onBarDoubleClick = (event: MouseEvent) => {
    if (!desktop) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, [role='button']")) {
      return;
    }
    desktop.window.maximize();
  };
</script>

<div class="workspace-tabbar" class:is-desktop={!!desktop} role="banner" ondblclick={onBarDoubleClick}>
  {#if isMacDesktop}
    <WindowControls />
  {/if}
  <a href={libraryHref(librarySection)} class="workspace-tab" class:is-active={showHome} title={$tr("editor.home")}>
    <MdIcon icon="home" />
    {$tr("editor.home")}
  </a>

  <CustomScroll class="workspace-tabbar__tabs" axis="x">
    {#each tabs as tab (tab.id)}
      <a href={editorHref(tab.id)} class="workspace-tab" class:is-active={!showHome && activeTabId === tab.id}>
        <span>{tab.title}</span>
        <span
          class="workspace-tab__close"
          role="button"
          tabindex="0"
          onclick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose(tab.id);
          }}
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              onClose(tab.id);
            }
          }}>
          <MdIcon icon="close" />
        </span>
      </a>
    {/each}
  </CustomScroll>

  <button type="button" class="workspace-icon-btn" onclick={onCreate} title={$tr("library.create")}>
    <MdIcon icon="add" />
  </button>

  <div class="workspace-tabbar__actions">
    {@render children?.()}
  </div>
  {#if desktop && !isMacDesktop}
    <WindowControls />
  {/if}
</div>

<style>
  .workspace-tabbar__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
</style>
