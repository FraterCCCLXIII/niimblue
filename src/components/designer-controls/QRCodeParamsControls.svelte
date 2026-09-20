<script lang="ts">
  import { QRCode } from "$/fabric-object/qrcode";
  import { tr } from "$/utils/i18n";
  import { getBoundText, setBoundText } from "$/utils/csv_preview";

  interface Props {
    selectedQRCode: QRCode;
    editRevision: number;
    csvVariables?: { [key: string]: string };
    valueUpdated: () => void;
  }

  let { selectedQRCode, editRevision, csvVariables, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision} />

<section class="insp-section">
  <h3 class="insp-heading">{$tr("params.text.content")}</h3>
  <textarea
    class="insp-field insp-textarea"
    value={getBoundText(selectedQRCode)}
    oninput={(e) => {
      setBoundText(selectedQRCode, e.currentTarget.value, csvVariables);
      valueUpdated();
    }}></textarea>
</section>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.qrcode.ecl")}</span>
  <select
    class="insp-field insp-select insp-field-narrow"
    value={selectedQRCode.ecl}
    onchange={(e) => {
      selectedQRCode?.set("ecl", e.currentTarget.value);
      valueUpdated();
    }}>
    <option value="L">Level L</option>
    <option value="M">Level M</option>
    <option value="Q">Level Q</option>
    <option value="H">Level H</option>
  </select>
</div>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.qrcode.mode")}</span>
  <select
    class="insp-field insp-select insp-field-narrow"
    value={selectedQRCode.mode}
    onchange={(e) => {
      selectedQRCode?.set("mode", e.currentTarget.value);
      valueUpdated();
    }}>
    <option value="Byte">Byte</option>
    <option value="Numeric">Numeric</option>
    <option value="Alphanumeric">Alphanumeric</option>
    <option value="Kanji">Kanji</option>
  </select>
</div>

<div class="insp-row">
  <span class="insp-row__label">{$tr("params.qrcode.version")}</span>
  <select
    class="insp-field insp-select insp-field-narrow"
    value={selectedQRCode.qrVersion}
    onchange={(e) => {
      selectedQRCode?.set("qrVersion", parseInt(e.currentTarget.value));
      valueUpdated();
    }}>
    <option value={0}>Auto</option>
    {#each { length: 40 }, i (i)}
      <option value={i + 1}>{i + 1}</option>
    {/each}
  </select>
</div>

<style>
  .insp-field-narrow {
    width: 132px;
  }
</style>
