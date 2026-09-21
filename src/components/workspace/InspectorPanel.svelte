<script lang="ts">
  import type { Snippet } from "svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import { tr } from "$/utils/i18n";

  export type InspectorTab = "label" | "object";

  interface Props {
    selectedCount: number;
    actions?: Snippet;
    label: Snippet;
    object: Snippet;
  }

  let { selectedCount, actions, label, object }: Props = $props();

  let tab = $state<InspectorTab>("label");

  $effect(() => {
    tab = selectedCount > 0 ? "object" : "label";
  });
</script>

<aside class="designer-inspector">
  {#if actions}
    <div class="inspector-actions">
      {@render actions()}
    </div>
  {/if}
  <div class="inspector-tabs" role="tablist">
    <button
      type="button"
      class="inspector-tab"
      class:is-active={tab === "label"}
      role="tab"
      aria-selected={tab === "label"}
      onclick={() => (tab = "label")}>
      {$tr("editor.label_settings")}
    </button>
    <button
      type="button"
      class="inspector-tab"
      class:is-active={tab === "object"}
      role="tab"
      aria-selected={tab === "object"}
      onclick={() => (tab = "object")}>
      {$tr("editor.object_settings")}
    </button>
  </div>

  <CustomScroll class="inspector-body" role="tabpanel">
    {#if tab === "label"}
      {@render label()}
    {:else}
      {@render object()}
    {/if}
  </CustomScroll>
</aside>
