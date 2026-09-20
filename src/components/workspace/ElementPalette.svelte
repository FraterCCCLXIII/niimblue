<script lang="ts">
  import type { LabelProps, OjectType } from "$/types";
  import type { AppIconName } from "$/utils/lucide_icons";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import CustomScroll from "$/components/basic/CustomScroll.svelte";
  import IconPicker from "$/components/designer-controls/IconPicker.svelte";
  import CsvControl from "$/components/designer-controls/CsvControl.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";

  interface Props {
    labelProps: LabelProps;
    csvEnabled: boolean;
    onPick: (type: OjectType) => void;
    onSvgIconPicked: (svg: string) => void;
    onCsvPlaceholderPicked: (name: string) => void;
    onCsvImported?: () => void;
    onCsvCleared?: () => void;
    zplImageReady: (img: Blob) => void;
    pdfImageReady: (img: HTMLCanvasElement) => void;
  }

  let {
    labelProps,
    csvEnabled = $bindable(),
    onPick,
    onSvgIconPicked,
    onCsvPlaceholderPicked,
    onCsvImported,
    onCsvCleared,
    zplImageReady,
    pdfImageReady,
  }: Props = $props();

  const tiles: { type: OjectType; icon: AppIconName; key: "text" | "image" | "barcode" | "qrcode" | "time" | "square" | "line" | "circle" | "sn" }[] = [
    { type: "text", icon: "title", key: "text" },
    { type: "image", icon: "image", key: "image" },
    { type: "line", icon: "horizontal_rule", key: "line" },
    { type: "circle", icon: "radio_button_unchecked", key: "circle" },
    { type: "rectangle", icon: "border_all", key: "square" },
    { type: "qrcode", icon: "qr_code_2", key: "qrcode" },
    { type: "barcode", icon: "view_week", key: "barcode" },
    { type: "sn", icon: "123", key: "sn" },
    { type: "time", icon: "schedule", key: "time" },
  ];
  const leadTiles = tiles.slice(0, 2);
  const remainingTiles = tiles.slice(2);

  const tileLabel = (key: (typeof tiles)[number]["key"]) => {
    if (key === "text") return $tr("editor.objectpicker.text");
    if (key === "image") return $tr("editor.objectpicker.image");
    if (key === "barcode") return $tr("editor.objectpicker.barcode");
    if (key === "qrcode") return $tr("editor.objectpicker.qrcode");
    if (key === "time") return $tr("editor.elements.time");
    if (key === "square") return $tr("editor.elements.border");
    if (key === "line") return $tr("editor.objectpicker.line");
    if (key === "circle") return $tr("editor.elements.figure");
    return $tr("editor.elements.sn");
  };
</script>

<CustomScroll class="designer-side">
  <h3>{$tr("editor.elements")}</h3>
  <div class="element-grid">
    {#each leadTiles as tile (tile.type)}
      <button type="button" class="element-tile" onclick={() => onPick(tile.type)}>
        <MdIcon icon={tile.icon} />
        {tileLabel(tile.key)}
      </button>
    {/each}
    <div class="element-tile tile-embed">
      <IconPicker onSubmitSvg={onSvgIconPicked} />
      <span>{$tr("editor.elements.icon")}</span>
    </div>
    {#each remainingTiles as tile (tile.type)}
      <button type="button" class="element-tile" onclick={() => onPick(tile.type)}>
        <MdIcon icon={tile.icon} />
        {tileLabel(tile.key)}
      </button>
    {/each}
    <div class="element-tile tile-embed">
      <PdfImportButton {labelProps} onImageReady={pdfImageReady} />
    </div>
    <div class="element-tile tile-embed">
      <ZplImportButton {labelProps} onImageReady={zplImageReady} />
    </div>
  </div>

  <h3 class="mt-4">{$tr("editor.data_source")}</h3>
  <div class="data-source">
    <CsvControl
      bind:enabled={csvEnabled}
      onPlaceholderPicked={onCsvPlaceholderPicked}
      onImported={onCsvImported}
      onCleared={onCsvCleared} />
  </div>
</CustomScroll>

<style>
  .tile-embed {
    position: relative;
  }

  .tile-embed :global(.dropdown),
  .tile-embed :global(button.btn) {
    width: 100%;
  }

  .tile-embed :global(button.btn) {
    border: 0;
    background: transparent;
    color: inherit;
    box-shadow: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .data-source {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
