<script lang="ts">
  import { type LabelProps, type OjectType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Button, Menu } from "$/components/ui";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";

  interface Props {
    onSubmit: (i: OjectType) => void;
    labelProps: LabelProps;
    zplImageReady: (img: Blob) => void;
    pdfImageReady: (img: HTMLCanvasElement) => void;
  }

  let { onSubmit, labelProps, zplImageReady, pdfImageReady }: Props = $props();
</script>

<Menu closeOnSelect={false} class="w-[min(100vw,450px)] p-0">
  {#snippet trigger({ toggle })}
    <Button size="sm" pill={false} onclick={toggle}>
      <MdIcon icon="format_shapes" />
      <MdIcon icon="add" />
    </Button>
  {/snippet}
  <h6 class="px-3 pt-3 text-[11px] font-semibold tracking-wide text-muted uppercase">{$tr("editor.objectpicker.title")}</h6>
  <div class="flex flex-wrap gap-2 p-3">
    <Button size="sm" pill={false} onclick={() => onSubmit("text")}>
      <MdIcon icon="title" />
      {$tr("editor.objectpicker.text")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("line")}>
      <MdIcon icon="remove" />
      {$tr("editor.objectpicker.line")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("rectangle")}>
      <MdIcon icon="crop_square" />
      {$tr("editor.objectpicker.rectangle")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("circle")}>
      <MdIcon icon="radio_button_unchecked" />
      {$tr("editor.objectpicker.circle")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("image")}>
      <MdIcon icon="image" />
      {$tr("editor.objectpicker.image")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("qrcode")}>
      <MdIcon icon="qr_code_2" />
      {$tr("editor.objectpicker.qrcode")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("aruco")}>
      <MdIcon icon="grid_on" />
      {$tr("editor.objectpicker.aruco")}
    </Button>
    <Button size="sm" pill={false} onclick={() => onSubmit("barcode")}>
      <MdIcon icon="view_week" />
      {$tr("editor.objectpicker.barcode")}
    </Button>
    <ZplImportButton {labelProps} onImageReady={zplImageReady} />
    <PdfImportButton {labelProps} onImageReady={pdfImageReady} />
  </div>
</Menu>
