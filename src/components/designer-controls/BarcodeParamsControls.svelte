<script lang="ts">
  import { Barcode } from "$/fabric-object/barcode";
  import { tr } from "$/utils/i18n";

  interface Props {
    selectedBarcode: Barcode;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedBarcode, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision} />

<section class="insp-section">
  <h3 class="insp-heading">{$tr("params.text.content")}</h3>
  <textarea
    class="insp-field insp-textarea"
    value={selectedBarcode.text}
    oninput={(e) => {
      selectedBarcode?.set("text", e.currentTarget.value);
      valueUpdated();
    }}></textarea>
</section>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.barcode.encoding")}</span>
  <select
    class="insp-field insp-select insp-field-narrow"
    value={selectedBarcode.encoding}
    onchange={(e) => {
      selectedBarcode?.set("encoding", e.currentTarget.value ?? "EAN13");
      valueUpdated();
    }}>
    <option value="EAN13">EAN13</option>
    <option value="CODE128B">Code128 B</option>
  </select>
</div>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.barcode.scale")}</span>
  <input
    class="insp-field insp-field-narrow"
    type="number"
    min="1"
    value={selectedBarcode.scaleFactor}
    oninput={(e) => {
      selectedBarcode?.set("scaleFactor", e.currentTarget.valueAsNumber ?? 1);
      valueUpdated();
    }} />
</div>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.barcode.font_size")}</span>
  <input
    class="insp-field insp-field-narrow"
    type="number"
    min="1"
    value={selectedBarcode.fontSize}
    oninput={(e) => {
      selectedBarcode?.set("fontSize", e.currentTarget.valueAsNumber ?? 12);
      valueUpdated();
    }} />
</div>

<label class="insp-check">
  <input
    type="checkbox"
    checked={selectedBarcode.printText}
    onchange={() => {
      selectedBarcode?.set("printText", !selectedBarcode.printText);
      valueUpdated();
    }} />
  <span>{$tr("params.barcode.enable_caption")}</span>
</label>

<style>
  .insp-field-narrow {
    width: 132px;
  }
</style>
