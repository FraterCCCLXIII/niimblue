<script lang="ts">
  import type { LabelPreset } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";

  interface Props {
    onItemSelected: (index: number) => void;
    onItemDelete: (index: number) => void;
    presets: LabelPreset[];
    class?: string;
  }

  let { class: className = "", onItemDelete, onItemSelected, presets }: Props = $props();
  let deleteIndex = $state<number>(-1);

  const scaleDimensions = (preset: LabelPreset): { width: number; height: number } => {
    const scaleFactor = Math.min(100 / preset.width, 100 / preset.height);
    return {
      width: Math.round(preset.width * scaleFactor),
      height: Math.round(preset.height * scaleFactor),
    };
  };

  const deleteConfirmed = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    deleteIndex = -1;
    onItemDelete(idx);
  };

  const deleteRejected = (e: MouseEvent) => {
    e.stopPropagation();
    deleteIndex = -1;
  };

  const deleteRequested = (e: MouseEvent, idx: number) => {
    e.stopPropagation();
    deleteIndex = idx;
  };
</script>

<CustomScroll class="preset-browser border {className}">
  <div class="flex flex-wrap gap-1 p-2">
  <!-- fixme: key -->
  {#each presets as item, idx (item)}
    <div
      role="button"
      class="card-wrapper flex items-center justify-center p-0"
      tabindex="0"
      onkeydown={() => onItemSelected(idx)}
      onclick={() => onItemSelected(idx)}>
      <div
        class="card print-start-{item.printDirection} flex items-center justify-center"
        style="width: {scaleDimensions(item).width}%; height: {scaleDimensions(item).height}%;">
        <div class="remove flex">
          {#if deleteIndex === idx}
            <button type="button" class="remove text-danger" onclick={(e) => deleteConfirmed(e, idx)}>
              <MdIcon icon="delete" />
            </button>
            <button type="button" class="remove text-emerald-600" onclick={(e) => deleteRejected(e)}>
              <MdIcon icon="close" />
            </button>
          {:else}
            <button type="button" class="remove text-danger" onclick={(e) => deleteRequested(e, idx)}>
              <MdIcon icon="delete" />
            </button>
          {/if}
        </div>

        <span class="label p-1">
          {#if item.title}
            {item.title}
          {:else}
            {item.width}x{item.height}{#if item.unit === "mm"}{$tr("params.label.mm")}{:else if item.unit === "px"}{$tr(
                "params.label.px",
              )}{/if}
          {/if}
        </span>
      </div>
    </div>
  {/each}
  </div>
</CustomScroll>

<style>
  .preset-browser {
    height: auto;
    max-height: 200px;
    max-width: 100%;
    min-height: 96px;
  }

  .preset-browser :global(.ws-scroll__view) {
    max-height: 200px;
  }

  .card-wrapper {
    width: 96px;
    height: 96px;
  }

  .card {
    background-color: white;
    position: relative;
  }

  .card > .remove {
    position: absolute;
    top: 0;
    right: 0;
  }

  .card > .remove > button {
    padding: 0;
    line-height: 100%;
  }

  .card > .label {
    background-color: rgba(255, 255, 255, 0.8);
    color: black;
    border-radius: 8px;
  }

  .card.print-start-left {
    border-left: 2px solid #ff4646;
  }
  .card.print-start-top {
    border-top: 2px solid #ff4646;
  }
</style>
