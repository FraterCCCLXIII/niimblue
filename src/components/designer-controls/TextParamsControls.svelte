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
  const lineHeightPercent = $derived(Math.round((selectedText.lineHeight ?? 1) * 100));
  const letterSpacingPercent = $derived(Math.round((selectedText.charSpacing ?? 0) / 10));
  const textStyle = $derived<"regular" | "italic" | "bold" | "bold_italic">(
    selectedText.fontWeight === "bold"
      ? selectedText.fontStyle === "italic"
        ? "bold_italic"
        : "bold"
      : selectedText.fontStyle === "italic"
        ? "italic"
        : "regular",
  );
  const sizeOptions = $derived(
    fontSizes.includes(Math.round(selectedText.fontSize))
      ? fontSizes
      : [...fontSizes, Math.round(selectedText.fontSize)].sort((a, b) => a - b),
  );

  const setXAlign = (align: fabric.TextboxProps["textAlign"]) => {
    apply({ textAlign: align });
  };

  const toggleUnderline = () => {
    apply({ underline: !selectedText.underline });
  };

  const setTextStyle = (style: "regular" | "italic" | "bold" | "bold_italic") => {
    apply({
      fontWeight: style === "bold" || style === "bold_italic" ? "bold" : "normal",
      fontStyle: style === "italic" || style === "bold_italic" ? "italic" : "normal",
    });
  };

  const setVOrigin = (originY: fabric.TOriginY) => {
    applyEach((obj) => {
      const pos = obj.getPointByOrigin(obj.originX ?? "left", obj.originY ?? "top");
      obj.set({ originY });
      obj.setPositionByOrigin(pos, obj.originX ?? "left", originY);
    });
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

  const fontSizeChange = (v: number) => {
    apply({ fontSize: isNaN(v) ? 1 : Math.min(Math.max(v, sizeMin), sizeMax) });
  };

  const setLineHeightPercent = (next: number) => {
    const pct = Number.isFinite(next) ? next : 100;
    apply({ lineHeight: Math.max(0.1, Math.min(10, pct / 100)) });
  };

  const setLetterSpacingPercent = (next: number) => {
    const pct = Number.isFinite(next) ? next : 0;
    apply({ charSpacing: Math.max(-500, Math.min(2000, pct * 10)) });
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
  <h3 class="insp-heading">{$tr("params.text.typography")}</h3>
  <div class="insp-type-stack">
    <FontFamilyPicker variant="inspector" {editRevision} value={selectedText.fontFamily} valueUpdated={updateFontFamily} />

    <div class="insp-type-pair">
      <label class="insp-xy">
        <select
          aria-label={$tr("params.text.weight")}
          value={textStyle}
          onchange={(e) => setTextStyle(e.currentTarget.value as "regular" | "italic" | "bold" | "bold_italic")}>
          <option value="regular">{$tr("params.text.weight.regular")}</option>
          <option value="italic">{$tr("params.text.weight.italic")}</option>
          <option value="bold">{$tr("params.text.weight.bold")}</option>
          <option value="bold_italic">{$tr("params.text.weight.bold_italic")}</option>
        </select>
      </label>
      <label class="insp-xy">
        <input
          type="number"
          inputmode="numeric"
          min={sizeMin}
          max={sizeMax}
          aria-label={$tr("params.text.font_size")}
          value={Math.round(selectedText.fontSize)}
          list="insp-font-sizes"
          onchange={(e) => fontSizeChange(Number(e.currentTarget.value))} />
        <datalist id="insp-font-sizes">
          {#each sizeOptions as size (size)}
            <option value={size}></option>
          {/each}
        </datalist>
      </label>
    </div>

    <div class="insp-type-pair">
      <div class="insp-type-field">
        <div class="insp-type-label">{$tr("params.text.line_height")}</div>
        <label class="insp-xy">
          <span>A</span>
          <input
            type="number"
            inputmode="decimal"
            aria-label={$tr("params.text.line_height")}
            value={lineHeightPercent}
            onchange={(e) => setLineHeightPercent(Number(e.currentTarget.value))} />
          <span class="insp-xy__suffix">%</span>
        </label>
      </div>
      <div class="insp-type-field">
        <div class="insp-type-label">{$tr("params.text.letter_spacing")}</div>
        <label class="insp-xy">
          <span>|A|</span>
          <input
            type="number"
            inputmode="decimal"
            aria-label={$tr("params.text.letter_spacing")}
            value={letterSpacingPercent}
            onchange={(e) => setLetterSpacingPercent(Number(e.currentTarget.value))} />
          <span class="insp-xy__suffix">%</span>
        </label>
      </div>
    </div>
  </div>

  <div class="insp-subhead">{$tr("params.text.alignment")}</div>
  <div class="insp-tools insp-pos-align">
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
    </div>
    <div class="insp-group">
      <button
        type="button"
        class:is-active={selectedText.originY === "top"}
        title={$tr("params.text.vorigin.top")}
        onclick={() => setVOrigin("top")}>
        <MdIcon icon="vertical_align_top" />
      </button>
      <button
        type="button"
        class:is-active={selectedText.originY === "center"}
        title={$tr("params.text.vorigin.center")}
        onclick={() => setVOrigin("center")}>
        <MdIcon icon="vertical_align_center" />
      </button>
      <button
        type="button"
        class:is-active={selectedText.originY === "bottom"}
        title={$tr("params.text.vorigin.bottom")}
        onclick={() => setVOrigin("bottom")}>
        <MdIcon icon="vertical_align_bottom" />
      </button>
    </div>
    <div class="insp-fmt">
      <button
        type="button"
        class:is-active={selectedText.textAlign === "justify"}
        title={$tr("params.text.align.justify")}
        onclick={() => setXAlign("justify")}>
        <MdIcon icon="format_align_justify" />
      </button>
      <button type="button" class:is-active={!!selectedText.underline} title={$tr("params.text.underline")} onclick={toggleUnderline}>
        <MdIcon icon="format_underlined" />
      </button>
    </div>
  </div>
</section>

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
