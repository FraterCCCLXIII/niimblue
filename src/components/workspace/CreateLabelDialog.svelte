<script lang="ts">
  import AppModal from "$/components/basic/AppModal.svelte";
  import { DEFAULT_LABEL_PRESETS } from "$/defaults";
  import type { LabelPreset, LabelProps } from "$/types";
  import { applyLabelDimensions, formatPresetSize, labelPropsFromPreset } from "$/utils/label_geometry";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { tr } from "$/utils/i18n";

  interface Props {
    show: boolean;
    onCreate: (label: LabelProps, title: string) => void;
  }

  let { show = $bindable(), onCreate }: Props = $props();

  let presets = $state<LabelPreset[]>(DEFAULT_LABEL_PRESETS);
  let selectedIndex = $state(0);
  let customWidth = $state(40);
  let customHeight = $state(20);
  let useCustom = $state(false);

  $effect(() => {
    if (show) {
      presets = LocalStoragePersistence.loadLabelPresets() ?? DEFAULT_LABEL_PRESETS;
      selectedIndex = 0;
      useCustom = false;
    }
  });

  const create = () => {
    if (useCustom) {
      onCreate(
        applyLabelDimensions({
          width: customWidth,
          height: customHeight,
          unit: "mm",
          dpmm: 8,
          printDirection: customWidth >= customHeight ? "left" : "top",
          shape: "rounded_rect",
        }),
        `${customWidth}×${customHeight}mm`,
      );
      return;
    }

    const preset = presets[selectedIndex] ?? DEFAULT_LABEL_PRESETS[0];
    onCreate(labelPropsFromPreset(preset), preset.title ?? formatPresetSize(preset));
  };
</script>

{#if show}
  <AppModal bind:show title={$tr("library.create.title")}>
    <div class="preset-list">
      {#each presets as preset, index (preset.title ?? `${preset.width}x${preset.height}-${index}`)}
        <button
          type="button"
          class="preset-item"
          class:is-active={!useCustom && selectedIndex === index}
          onclick={() => {
            useCustom = false;
            selectedIndex = index;
          }}>
          <strong>{preset.title ?? formatPresetSize(preset)}</strong>
          <span>{formatPresetSize(preset)}</span>
        </button>
      {/each}
    </div>

    <label class="ws-check">
      <input type="checkbox" bind:checked={useCustom} />
      <span>{$tr("library.create.custom")}</span>
    </label>

    {#if useCustom}
      <div class="ws-field-row">
        <input class="insp-field" type="number" min="10" bind:value={customWidth} />
        <input class="insp-field" type="number" min="10" bind:value={customHeight} />
      </div>
    {/if}

    {#snippet footer()}
      <button type="button" class="ws-btn ws-btn-primary" onclick={create}>{$tr("library.create.action")}</button>
    {/snippet}
  </AppModal>
{/if}

<style>
  .preset-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .preset-item {
    appearance: none;
    border: 1px solid var(--ws-line, #eee);
    background: #fff;
    border-radius: 10px;
    padding: 12px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preset-item.is-active {
    border-color: #ff4d4f;
    background: #fff1f0;
  }

  .preset-item span {
    color: var(--ws-muted, #8b8b8b);
    font-size: 12px;
  }
</style>
