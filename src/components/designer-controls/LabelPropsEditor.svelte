<script lang="ts">
  import {
    LabelPresetSchema,
    type LabelPreset,
    type LabelProps,
    type LabelShape,
    type LabelSplit,
    type LabelUnit,
    type MirrorType,
    type TailPosition,
  } from "$/types";
  import { printerMeta } from "$/stores";
  import { tr } from "$/utils/i18n";
  import { DEFAULT_LABEL_PRESETS } from "$/defaults";
  import { onMount, tick } from "svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import type { PrintDirection } from "@mmote/niimbluelib";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Button } from "$/components/ui";
  import { Toasts } from "$/utils/toasts";
  import { FileUtils } from "$/utils/file_utils";
  import { formatPresetSize } from "$/utils/label_geometry";
  import { z } from "zod";

  interface Props {
    labelProps: LabelProps;
    onChange: (newProps: LabelProps) => void;
  }

  let { labelProps, onChange }: Props = $props();

  const tailPositions: TailPosition[] = ["right", "bottom", "left", "top"];
  const printDirections: PrintDirection[] = ["left", "top"];
  const labelShapes: LabelShape[] = ["rect", "rounded_rect", "circle"];
  const labelSplits: LabelSplit[] = ["none", "vertical", "horizontal"];
  const mirrorTypes: MirrorType[] = ["none", "flip", "copy"];

  let labelPresets = $state<LabelPreset[]>(DEFAULT_LABEL_PRESETS);

  let title = $state<string | undefined>("");
  let prevUnit: LabelUnit = "mm";
  let unit = $state<LabelUnit>("mm");
  let dpmm = $state<number>(8);
  let width = $state<number>(0);
  let height = $state<number>(0);
  let printDirection = $state<PrintDirection>("left");
  let shape = $state<LabelShape>("rect");
  let split = $state<LabelSplit>("none");
  let splitParts = $state<number>(2);
  let tailLength = $state<number>(0);
  let tailPos = $state<TailPosition>("right");
  let mirror = $state<MirrorType>("none");

  let error = $derived.by<string>(() => {
    let error = "";

    const headSize = labelProps.printDirection == "left" ? labelProps.size.height : labelProps.size.width;
    if ($printerMeta !== undefined) {
      if (headSize > $printerMeta.printheadPixels) {
        error += $tr("params.label.warning.width") + " ";
        error += `(${headSize} > ${$printerMeta.printheadPixels})`;
        error += "\n";
      }

      if ($printerMeta.printDirection !== labelProps.printDirection) {
        error += $tr("params.label.warning.direction") + " ";
        if ($printerMeta.printDirection == "left") {
          error += $tr("params.label.direction.left");
        } else {
          error += $tr("params.label.direction.top");
        }
      }
    }

    if (headSize % 8 !== 0) {
      error += $tr("params.label.warning.div8");
    }

    return error;
  });

  const onApply = () => {
    let newWidth = width;
    let newHeight = height;
    let newTailLength = tailLength;

    // mm to px
    if (unit === "mm") {
      newWidth *= dpmm;
      newHeight *= dpmm;
      newTailLength *= dpmm;
    }

    // limit min size
    newWidth = newWidth < dpmm ? dpmm : newWidth;
    newHeight = newHeight < dpmm ? dpmm : newHeight;

    // width must me multiple of 8
    if (printDirection === "left") {
      newHeight -= newHeight % 8;
    } else {
      newWidth -= newWidth % 8;
    }

    onChange({
      printDirection: printDirection,
      size: {
        width: Math.floor(newWidth),
        height: Math.floor(newHeight),
      },
      shape,
      split,
      splitParts,
      tailPos,
      tailLength: Math.floor(newTailLength),
      mirror,
    });
  };

  const onLabelPresetSelected = (index: number) => {
    const preset = labelPresets[index];

    if (preset !== undefined) {
      dpmm = preset.dpmm;
      prevUnit = preset.unit;
      unit = preset.unit;
      printDirection = preset.printDirection;
      width = preset.width;
      height = preset.height;
      title = preset.title ?? "";
      shape = preset.shape ?? "rect";
      split = preset.split ?? "none";
      splitParts = preset.splitParts ?? 2;
      tailPos = preset.tailPos ?? "right";
      tailLength = preset.tailLength ?? 0;
      mirror = preset.mirror ?? "none";
    }

    onApply();
  };

  const onLabelPresetDelete = (idx: number) => {
    const result = [...labelPresets];
    result.splice(idx, 1);
    labelPresets = result;
    LocalStoragePersistence.saveLabelPresets(labelPresets);
  };

  const onLabelPresetAdd = () => {
    const newPreset: LabelPreset = {
      dpmm,
      printDirection,
      unit,
      width,
      height,
      title,
      shape,
      split,
      splitParts,
      tailPos,
      tailLength,
      mirror,
    };
    const newPresets = [...labelPresets, newPreset];
    try {
      LocalStoragePersistence.saveLabelPresets(newPresets);
      labelPresets = newPresets;
    } catch (e) {
      Toasts.zodErrors(e, "Presets save error:");
    }
  };

  export function apply() {
    onApply();
  }

  export function saveTemplate() {
    onLabelPresetAdd();
  }

  const onFlip = () => {
    let widthTmp = width;
    width = height;
    height = widthTmp;
    printDirection = printDirection === "top" ? "left" : "top";
  };

  const onUnitChange = () => {
    if (prevUnit === "mm" && unit === "px") {
      width = Math.floor(width * dpmm);
      height = Math.floor(height * dpmm);
      tailLength = Math.floor(tailLength * dpmm);
    } else if (prevUnit === "px" && unit === "mm") {
      width = Math.floor(width / dpmm);
      height = Math.floor(height / dpmm);
      tailLength = Math.floor(tailLength / dpmm);
    }
    prevUnit = unit;
  };

  const fillWithCurrentParams = () => {
    prevUnit = "px";
    width = labelProps.size.width;
    height = labelProps.size.height;
    printDirection = labelProps.printDirection;
    shape = labelProps.shape ?? "rect";
    split = labelProps.split ?? "none";
    splitParts = labelProps.splitParts ?? 2;
    tailPos = labelProps.tailPos ?? "right";
    tailLength = labelProps.tailLength ?? 0;
    mirror = labelProps.mirror ?? "none";
    onUnitChange();
  };

  const onImportClicked = async () => {
    const contents = await FileUtils.pickAndReadSingleTextFile("json");
    const rawData = JSON.parse(contents);

    if (!confirm($tr("params.label.warning.import"))) {
      return;
    }

    try {
      const presets = z.array(LabelPresetSchema).parse(rawData);
      LocalStoragePersistence.saveLabelPresets(presets);
      labelPresets = presets;
    } catch (e) {
      Toasts.zodErrors(e, "Presets load error:");
    }
  };

  const onExportClicked = () => {
    try {
      FileUtils.saveLabelPresetsAsJson(labelPresets);
    } catch (e) {
      Toasts.zodErrors(e, "Presets save error:");
    }
  };

  onMount(() => {
    const defaultPreset: LabelPreset = DEFAULT_LABEL_PRESETS[0];
    width = defaultPreset.width;
    height = defaultPreset.height;
    prevUnit = defaultPreset.unit;
    unit = defaultPreset.unit;
    printDirection = defaultPreset.printDirection;
    shape = defaultPreset.shape ?? "rect";
    split = defaultPreset.split ?? "none";
    tailPos = defaultPreset.tailPos ?? "right";
    tailLength = defaultPreset.tailLength ?? 0;
    mirror = defaultPreset.mirror ?? "none";

    try {
      const savedPresets: LabelPreset[] | null = LocalStoragePersistence.loadLabelPresets();
      if (savedPresets !== null) {
        labelPresets = savedPresets;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Presets load error:");
    }

    tick().then(() => fillWithCurrentParams());
  });

  $effect(() => {
    if (shape === "circle" && split !== "none") split = "none";
  });

  $effect(() => {
    if (split === "none" || tailLength < 0) tailLength = 0;
  });

  $effect(() => {
    if (mirror === "flip" && splitParts !== 2) mirror = "copy";
  });
</script>

<div class="lp-form">
  <div class="lp-toolbar">
    <Button onclick={onImportClicked}>
      <MdIcon icon="upload" />
      {$tr("params.label.import")}
    </Button>
    <Button onclick={onExportClicked}>
      <MdIcon icon="download" />
      {$tr("params.label.export")}
    </Button>
  </div>

  <p class="lp-current" class:is-warning={!!error} title={error || undefined}>
    {labelProps.size.width} × {labelProps.size.height}
    {$tr("params.label.px")}
    ·
    {labelProps.printDirection === "top" ? $tr("params.label.direction.top") : $tr("params.label.direction.left")}
  </p>
  {#if error}
    <p class="lp-error">{error}</p>
  {/if}

  <section class="lp-section">
    <h3 class="insp-heading">{$tr("params.label.templates")}</h3>
    <div class="lp-presets">
      {#each labelPresets as preset, index (`${preset.title ?? ""}-${preset.width}x${preset.height}-${index}`)}
        <button type="button" class="lp-preset" onclick={() => onLabelPresetSelected(index)}>
          <strong>{preset.title ?? formatPresetSize(preset)}</strong>
          <span
            class="lp-preset__delete"
            role="button"
            tabindex="0"
            title={$tr("editor.delete")}
            onclick={(event) => {
              event.stopPropagation();
              onLabelPresetDelete(index);
            }}
            onkeydown={(event) => {
              if (event.key === "Enter") {
                event.stopPropagation();
                onLabelPresetDelete(index);
              }
            }}>
            <MdIcon icon="close" />
          </span>
        </button>
      {/each}
    </div>
  </section>

  <section class="lp-section">
    <h3 class="insp-heading">{$tr("params.label.size")}</h3>
    <div class="lp-size">
      <input class="insp-field" type="number" min="1" step={unit === "px" ? 8 : 1} bind:value={width} />
      <button type="button" class="workspace-icon-btn" title={$tr("editor.rotate")} onclick={onFlip}>
        <MdIcon icon="swap_horiz" />
      </button>
      <input class="insp-field" type="number" min="1" step={unit === "px" ? 8 : 1} bind:value={height} />
      <select class="insp-field lp-unit" bind:value={unit} onchange={onUnitChange}>
        <option value="mm">{$tr("params.label.mm")}</option>
        <option value="px">{$tr("params.label.px")}</option>
      </select>
    </div>
  </section>

  {#if unit !== "px"}
    <div class="insp-row">
      <span class="insp-row__label" title={$tr("params.label.head_density.help")}>{$tr("params.label.head_density")}</span>
      <div class="lp-size">
        <select class="insp-field" bind:value={dpmm}>
          <option value={8}>203 dpi</option>
          <option value={11.81}>300 dpi</option>
        </select>
        <input class="insp-field" type="number" min="1" step="0.01" bind:value={dpmm} />
        <span class="ws-suffix">{$tr("params.label.dpmm")}</span>
      </div>
    </div>
  {/if}

  <section class="lp-section">
    <h3 class="insp-heading">{$tr("params.label.direction")}</h3>
    <div class="insp-segment">
      {#each printDirections as value (value)}
        <button type="button" class:is-active={printDirection === value} onclick={() => (printDirection = value)}>
          {value === "left" ? $tr("params.label.direction.left") : $tr("params.label.direction.top")}
        </button>
      {/each}
    </div>
  </section>

  <section class="lp-section">
    <h3 class="insp-heading">{$tr("params.label.shape")}</h3>
    <div class="insp-segment">
      <button type="button" class:is-active={shape === "rect"} onclick={() => (shape = "rect")}>
        {$tr("editor.label_settings.shape.rect")}
      </button>
      <button type="button" class:is-active={shape === "rounded_rect"} onclick={() => (shape = "rounded_rect")}>
        {$tr("editor.label_settings.shape.rounded")}
      </button>
      <button type="button" class:is-active={shape === "circle"} onclick={() => (shape = "circle")}>
        {$tr("editor.label_settings.shape.circle")}
      </button>
    </div>
  </section>

  {#if shape !== "circle"}
    <section class="lp-section">
      <h3 class="insp-heading">{$tr("params.label.split")}</h3>
      <div class="insp-segment">
        <button type="button" class:is-active={split === "none"} onclick={() => (split = "none")}>
          {$tr("params.label.split.none")}
        </button>
        <button type="button" class:is-active={split === "vertical"} onclick={() => (split = "vertical")}>
          {$tr("params.label.split.vertical")}
        </button>
        <button type="button" class:is-active={split === "horizontal"} onclick={() => (split = "horizontal")}>
          {$tr("params.label.split.horizontal")}
        </button>
      </div>
    </section>

    {#if split !== "none"}
      <div class="insp-row">
        <span class="insp-row__label">{$tr("params.label.split.count")}</span>
        <input class="insp-field lp-narrow" type="number" min="1" bind:value={splitParts} />
      </div>
    {/if}
  {/if}

  {#if split !== "none"}
    <section class="lp-section">
      <h3 class="insp-heading">{$tr("params.label.mirror")}</h3>
      <div class="insp-segment">
        <button type="button" class:is-active={mirror === "none"} onclick={() => (mirror = "none")}>
          {$tr("params.label.mirror.none")}
        </button>
        <button type="button" class:is-active={mirror === "copy"} onclick={() => (mirror = "copy")}>
          {$tr("params.label.mirror.copy")}
        </button>
        <button type="button" class:is-active={mirror === "flip"} onclick={() => (mirror = "flip")}>
          {$tr("params.label.mirror.flip")}
        </button>
      </div>
    </section>

    <section class="lp-section">
      <h3 class="insp-heading">{$tr("params.label.tail.position")}</h3>
      <div class="insp-segment">
        {#each tailPositions as value (value)}
          <button type="button" class:is-active={tailPos === value} onclick={() => (tailPos = value)}>
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        {/each}
      </div>
    </section>

    <div class="insp-row">
      <span class="insp-row__label">{$tr("params.label.tail.length")}</span>
      <div class="lp-size">
        <input class="insp-field lp-narrow" type="number" min="0" bind:value={tailLength} />
        <span class="ws-suffix">{unit === "px" ? $tr("params.label.px") : $tr("params.label.mm")}</span>
      </div>
    </div>
  {/if}

  <section class="lp-section">
    <h3 class="insp-heading">{$tr("params.label.label_title")}</h3>
    <input class="insp-field" type="text" bind:value={title} />
  </section>
</div>

<style>
  .lp-form {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .lp-toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .lp-current {
    margin: 0 0 8px;
    color: var(--ws-muted);
    font-size: 13px;
  }

  .lp-current.is-warning {
    color: #c47d00;
  }

  .lp-error {
    margin: 0 0 12px;
    color: #a8071a;
    font-size: 12px;
    white-space: pre-wrap;
  }

  .lp-section {
    margin-top: 16px;
  }

  .lp-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .lp-preset {
    appearance: none;
    position: relative;
    border: 1px solid var(--ws-line);
    background: var(--ws-surface);
    border-radius: 10px;
    padding: 10px 28px 10px 12px;
    text-align: left;
    font-size: 13px;
  }

  .lp-preset:hover,
  .lp-preset:focus-visible {
    border-color: var(--ws-accent);
    background: var(--ws-active);
  }

  .lp-preset__delete {
    position: absolute;
    top: 4px;
    right: 4px;
    display: inline-flex;
    color: var(--ws-muted);
  }

  .lp-size {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lp-unit,
  .lp-narrow {
    max-width: 88px;
  }
</style>
