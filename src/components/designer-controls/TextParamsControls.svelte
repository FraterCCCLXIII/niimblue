<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import FontFamilyPicker from "$/components/designer-controls/FontFamilyPicker.svelte";
  import { TextboxExt } from "$/fabric-object/textbox-ext";
  import { getBoundText, setBoundText } from "$/utils/csv_preview";

  interface Props {
    selectedText: fabric.IText;
    textTargets?: fabric.IText[];
    editRevision: number;
    csvVariables?: { [key: string]: string };
    valueUpdated: () => void;
  }

  let { selectedText, textTargets, editRevision, csvVariables, valueUpdated }: Props = $props();

  const texts = () => (textTargets && textTargets.length > 0 ? textTargets : [selectedText]);

  const apply = (patch: Record<string, unknown>) => {
    for (const obj of texts()) {
      obj.set(patch);
      obj.setCoords();
    }
    valueUpdated();
  };

  const applyEach = (update: (obj: fabric.IText) => void) => {
    for (const obj of texts()) {
      update(obj);
      obj.setCoords();
    }
    valueUpdated();
  };

  const sizeMin = 1;
  const sizeMax = 999;
  const fontSizes = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72];
  const printRed = "#ff3b30";

  const normalizedAngle = $derived((((selectedText.angle ?? 0) % 360) + 360) % 360);
  const textDirection = $derived<"horizontal" | "vertical" | "rotate">(
    normalizedAngle >= 45 && normalizedAngle < 135 ? "vertical" : normalizedAngle >= 225 && normalizedAngle < 315 ? "rotate" : "horizontal",
  );
  const fillColor = $derived(String(selectedText.fill ?? "black").toLowerCase());
  const isRed = $derived(fillColor === "red" || fillColor === printRed || fillColor === "#ff0000" || fillColor === "#e31c23" || fillColor === "#ff4d4f");
  const background = $derived(String(selectedText.backgroundColor || "transparent").toLowerCase());
  const isReversed = $derived(background !== "" && background !== "transparent" && background !== "white" && background !== "#ffffff");
  const printColor = $derived(isRed ? printRed : "black");
  const kerningValue = $derived(Math.round((selectedText.charSpacing ?? 0) / 10));
  const spacingValue = $derived(Math.round(((selectedText.lineHeight ?? 1) - 1) * 10));
  const sizeOptions = $derived(
    fontSizes.includes(Math.round(selectedText.fontSize))
      ? fontSizes
      : [...fontSizes, Math.round(selectedText.fontSize)].sort((a, b) => a - b),
  );

  const setXAlign = (align: fabric.TextboxProps["textAlign"]) => {
    apply({ textAlign: align });
  };

  const toggleBold = () => {
    apply({ fontWeight: selectedText.fontWeight === "bold" ? "normal" : "bold" });
  };

  const toggleItalic = () => {
    apply({ fontStyle: selectedText.fontStyle === "italic" ? "normal" : "italic" });
  };

  const toggleUnderline = () => {
    apply({ underline: !selectedText.underline });
  };

  const toggleFontAutoSize = () => {
    const next = selectedText instanceof TextboxExt ? !selectedText.fontAutoSize : false;
    applyEach((obj) => {
      if (obj instanceof TextboxExt) {
        obj.set({ fontAutoSize: next });
      }
    });
  };

  const updateFontFamily = (v: string) => {
    apply({ fontFamily: v });
  };

  const nextFontSize = (size: number, direction: 1 | -1) => {
    if (direction > 0) {
      return Math.min(size > 40 ? Math.round(size * 1.1) : size + 2, sizeMax);
    }
    return Math.max(size > 40 ? Math.round(size * 0.9) : size - 2, sizeMin);
  };

  const fontSizeUp = () => {
    applyEach((obj) => obj.set({ fontSize: nextFontSize(obj.fontSize, 1) }));
  };

  const fontSizeDown = () => {
    applyEach((obj) => obj.set({ fontSize: nextFontSize(obj.fontSize, -1) }));
  };

  const fontSizeChange = (v: number) => {
    apply({ fontSize: isNaN(v) ? 1 : Math.min(Math.max(v, sizeMin), sizeMax) });
  };

  const setKerning = (next: number) => {
    apply({ charSpacing: Math.max(-200, Math.min(200, next * 10)) });
  };

  const setLineSpacing = (next: number) => {
    apply({ lineHeight: Math.max(0.1, Math.min(10, 1 + next / 10)) });
  };

  const applyPrintColor = (color: string, reversed = isReversed) => {
    if (reversed) {
      apply({ fill: "white", backgroundColor: color });
    } else {
      apply({ fill: color, backgroundColor: "transparent" });
    }
  };

  const toggleReverse = () => {
    applyPrintColor(printColor, !isReversed);
  };

  const setTextDirection = (direction: "horizontal" | "vertical" | "rotate") => {
    const angle = direction === "vertical" ? 90 : direction === "rotate" ? 270 : 0;
    applyEach((obj) => obj.rotate(angle));
  };

  const textChanged = (value: string) => {
    setBoundText(selectedText, value, csvVariables);
    selectedText.setCoords();
    valueUpdated();
  };

  const splitChanged = (wrapByWord: boolean) => {
    applyEach((obj) => {
      if (obj instanceof fabric.Textbox) {
        obj.set({ splitByGrapheme: !wrapByWord });
      }
    });
  };
</script>

<input type="hidden" value={editRevision} />

<section class="insp-section">
  <h3 class="insp-heading">{$tr("params.text.content")}</h3>
  <textarea
    class="insp-field insp-textarea"
    value={getBoundText(selectedText)}
    oninput={(e) => textChanged(e.currentTarget.value)}></textarea>
</section>

<section class="insp-section">
  <h3 class="insp-heading">{$tr("params.text.style")}</h3>
  <FontFamilyPicker variant="inspector" {editRevision} value={selectedText.fontFamily} valueUpdated={updateFontFamily} />

  <div class="insp-size">
    <div class="insp-size-step">
      <button type="button" title={$tr("params.text.font_size.down")} onclick={fontSizeDown}>A-</button>
      <button type="button" title={$tr("params.text.font_size.up")} onclick={fontSizeUp}>A+</button>
    </div>
    <select
      class="insp-field insp-select"
      title={$tr("params.text.font_size")}
      value={Math.round(selectedText.fontSize)}
      onchange={(e) => fontSizeChange(Number(e.currentTarget.value))}>
      {#each sizeOptions as size (size)}
        <option value={size}>{size}</option>
      {/each}
    </select>
  </div>

  <div class="insp-tools">
    <div class="insp-group">
      <button
        type="button"
        class:is-active={selectedText.textAlign === "left"}
        title={$tr("params.text.align.left")}
        onclick={() => setXAlign("left")}>
        <MdIcon icon="format_align_left" />
      </button>
      <button
        type="button"
        class:is-active={selectedText.textAlign === "center"}
        title={$tr("params.text.align.center")}
        onclick={() => setXAlign("center")}>
        <MdIcon icon="format_align_center" />
      </button>
      <button
        type="button"
        class:is-active={selectedText.textAlign === "right"}
        title={$tr("params.text.align.right")}
        onclick={() => setXAlign("right")}>
        <MdIcon icon="format_align_right" />
      </button>
      <button
        type="button"
        class:is-active={selectedText.textAlign === "justify"}
        title={$tr("params.text.align.justify")}
        onclick={() => setXAlign("justify")}>
        <MdIcon icon="format_align_justify" />
      </button>
    </div>
  </div>
</section>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.text.formatting")}</span>
  <div class="insp-fmt">
    <button type="button" class:is-active={selectedText.fontWeight === "bold"} title={$tr("params.text.bold")} onclick={toggleBold}>
      <MdIcon icon="format_bold" />
    </button>
    <button type="button" class:is-active={!!selectedText.underline} title={$tr("params.text.underline")} onclick={toggleUnderline}>
      <MdIcon icon="format_underlined" />
    </button>
    <button type="button" class:is-active={selectedText.fontStyle === "italic"} title={$tr("params.text.italic")} onclick={toggleItalic}>
      <MdIcon icon="format_italic" />
    </button>
  </div>
</div>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.text.kerning")}</span>
  <div class="insp-stepper">
    <button type="button" onclick={() => setKerning(kerningValue - 1)}>-</button>
    <span>{kerningValue}</span>
    <button type="button" onclick={() => setKerning(kerningValue + 1)}>+</button>
  </div>
</div>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.text.line_spacing")}</span>
  <div class="insp-stepper">
    <button type="button" onclick={() => setLineSpacing(spacingValue - 1)}>-</button>
    <span>{spacingValue}</span>
    <button type="button" onclick={() => setLineSpacing(spacingValue + 1)}>+</button>
  </div>
</div>

<section class="insp-section">
  <h3 class="insp-heading">{$tr("params.text.direction")}</h3>
  <div class="insp-segment">
    <button
      type="button"
      class:is-active={textDirection === "horizontal"}
      title={$tr("params.text.direction.horizontal")}
      onclick={() => setTextDirection("horizontal")}>
      <span class="insp-dir-label">ABC<MdIcon icon="arrow_forward" /></span>
    </button>
    <button
      type="button"
      class:is-active={textDirection === "vertical"}
      title={$tr("params.text.direction.vertical")}
      onclick={() => setTextDirection("vertical")}>
      <span class="insp-dir-label">ABC<MdIcon icon="arrow_downward" /></span>
    </button>
    <button
      type="button"
      class:is-active={textDirection === "rotate"}
      title={$tr("params.text.direction.rotate")}
      onclick={() => setTextDirection("rotate")}>
      <span class="insp-dir-label">ABC<MdIcon icon="rotate_left" /></span>
    </button>
  </div>
</section>

<div class="insp-row">
  <span class="insp-row__label">
    {$tr("params.color")}
    <span class="insp-help" title={$tr("params.color.help")}><MdIcon icon="help" /></span>
  </span>
  <div class="insp-swatches">
    <button
      type="button"
      class="insp-swatch is-black"
      class:is-active={!isRed}
      title={$tr("params.color.black")}
      onclick={() => applyPrintColor("black")}></button>
    <button
      type="button"
      class="insp-swatch is-red"
      class:is-active={isRed}
      title={$tr("params.color.red")}
      onclick={() => applyPrintColor(printRed)}></button>
  </div>
</div>

<label class="insp-check">
  <input type="checkbox" checked={isReversed} onchange={toggleReverse} />
  <span>
    {$tr("params.text.reverse")}
    <span class="insp-help" title={$tr("params.text.reverse.help")}><MdIcon icon="help" /></span>
  </span>
</label>

{#if selectedText instanceof fabric.Textbox}
  <label class="insp-check">
    <input type="checkbox" checked={!selectedText.splitByGrapheme} onchange={(e) => splitChanged(e.currentTarget.checked)} />
    <span>
      {$tr("params.text.wrap_word")}
      <span class="insp-help" title={$tr("params.text.wrap_word.help")}><MdIcon icon="help" /></span>
    </span>
  </label>
{/if}

{#if selectedText instanceof TextboxExt}
  <label class="insp-check">
    <input type="checkbox" checked={selectedText.fontAutoSize} onchange={toggleFontAutoSize} />
    <span>{$tr("params.text.autosize")}</span>
  </label>
{/if}
