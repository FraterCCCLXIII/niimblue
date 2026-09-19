<script lang="ts">
  import type { Snippet } from "svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import WindowControls from "$/components/workspace/WindowControls.svelte";
  import { getDesktop } from "$/utils/desktop";
  import { tr } from "$/utils/i18n";

  export interface WorkspaceTab {
    id: string;
    title: string;
  }

  interface Props {
    tabs: WorkspaceTab[];
    activeTabId: string | null;
    showHome: boolean;
    onHome: () => void;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
    onCreate: () => void;
    children?: Snippet;
  }

  let { tabs, activeTabId, showHome, onHome, onSelect, onClose, onCreate, children }: Props = $props();

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
  <button type="button" class="workspace-tab" class:is-active={showHome} onclick={onHome} title={$tr("editor.home")}>
    <MdIcon icon="home" />
    {$tr("editor.home")}
  </button>

  <div class="workspace-tabbar__tabs">
    {#each tabs as tab (tab.id)}
      <button type="button" class="workspace-tab" class:is-active={!showHome && activeTabId === tab.id} onclick={() => onSelect(tab.id)}>
        <span>{tab.title}</span>
        <span
          class="workspace-tab__close"
          role="button"
          tabindex="0"
          onclick={(e) => {
            e.stopPropagation();
            onClose(tab.id);
          }}
          onkeydown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onClose(tab.id);
            }
          }}>
          <MdIcon icon="close" />
        </span>
      </button>
    {/each}
  </div>

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
