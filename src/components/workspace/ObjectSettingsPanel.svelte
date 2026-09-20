<script lang="ts">
  import * as fabric from "fabric";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import BarcodeParamsPanel from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import ArUcoParamsPanel from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import QrCodeParamsPanel from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import { alignObjectsToEachOther, type ObjectAlign } from "$/utils/object_align";

  interface Props {
    selectedObject?: fabric.FabricObject;
    selectedCount: number;
    editRevision: number;
    onDelete: () => void;
    onClone: () => void;
    onValueUpdated: () => void;
  }

  let { selectedObject, selectedCount, editRevision, onDelete, onClone, onValueUpdated }: Props = $props();

  const targets = $derived.by(() => {
    if (!selectedObject) {
      return [] as fabric.FabricObject[];
    }
    if (selectedObject instanceof fabric.ActiveSelection) {
      return selectedObject.getObjects();
    }
    return [selectedObject];
  });

  const primaryText = $derived(targets.length > 0 && targets.every((obj) => obj instanceof fabric.IText) ? (targets[0] as fabric.IText) : undefined);
  const primaryQr = $derived(targets.length === 1 && targets[0] instanceof QRCode ? targets[0] : undefined);
  const primaryAruco = $derived(targets.length === 1 && targets[0] instanceof ArUcoMarker ? targets[0] : undefined);
  const primaryBarcode = $derived(targets.length === 1 && targets[0] instanceof Barcode ? targets[0] : undefined);
  const showVariables = $derived(
    !!primaryText || !!primaryQr || (primaryBarcode != null && primaryBarcode.encoding === "CODE128B"),
  );

  const syncTextStyles = () => {
    if (primaryText && targets.length > 1) {
      for (const obj of targets.slice(1)) {
        if (!(obj instanceof fabric.IText)) {
          continue;
        }
        obj.set({
          fontFamily: primaryText.fontFamily,
          fontSize: primaryText.fontSize,
          fontWeight: primaryText.fontWeight,
          fontStyle: primaryText.fontStyle,
          underline: primaryText.underline,
          fill: primaryText.fill,
          textAlign: primaryText.textAlign,
          originY: primaryText.originY,
          charSpacing: primaryText.charSpacing,
          lineHeight: primaryText.lineHeight,
          backgroundColor: primaryText.backgroundColor,
        });
        obj.setCoords();
      }
    }
    onValueUpdated();
  };

  const alignSelection = (align: ObjectAlign) => {
    if (targets.length < 2) {
      return;
    }
    alignObjectsToEachOther(targets, align);
    onValueUpdated();
  };
</script>

{#if selectedCount === 0}
  <p class="object-empty">{$tr("editor.object_settings.empty")}</p>
{:else if selectedObject}
  {#if selectedCount > 1 && !primaryText}
    <section class="insp-section">
      <h3 class="insp-heading">{$tr("editor.object_settings.align")}</h3>
      <div class="insp-tools">
        <div class="insp-group">
          <button type="button" title={$tr("params.text.align.left")} onclick={() => alignSelection("left")}>
            <MdIcon icon="format_align_left" />
          </button>
          <button type="button" title={$tr("params.text.align.center")} onclick={() => alignSelection("center")}>
            <MdIcon icon="format_align_center" />
          </button>
          <button type="button" title={$tr("params.text.align.right")} onclick={() => alignSelection("right")}>
            <MdIcon icon="format_align_right" />
          </button>
        </div>
        <div class="insp-group insp-group--compact">
          <button type="button" title={$tr("params.text.vorigin.top")} onclick={() => alignSelection("top")}>
            <MdIcon icon="vertical_align_top" />
          </button>
          <button type="button" title={$tr("params.text.vorigin.center")} onclick={() => alignSelection("middle")}>
            <MdIcon icon="vertical_align_center" />
          </button>
          <button type="button" title={$tr("params.text.vorigin.bottom")} onclick={() => alignSelection("bottom")}>
            <MdIcon icon="vertical_align_bottom" />
          </button>
        </div>
      </div>
    </section>
  {/if}

  {#if primaryText}
    <TextParamsControls selectedText={primaryText} {targets} {editRevision} valueUpdated={syncTextStyles} />
  {/if}

  {#if primaryQr}
    <QrCodeParamsPanel selectedQRCode={primaryQr} {editRevision} valueUpdated={onValueUpdated} />
  {/if}
  {#if primaryAruco}
    <ArUcoParamsPanel selectedArUco={primaryAruco} {editRevision} valueUpdated={onValueUpdated} />
  {/if}
  {#if primaryBarcode}
    <BarcodeParamsPanel selectedBarcode={primaryBarcode} {editRevision} valueUpdated={onValueUpdated} />
  {/if}

  {#if showVariables}
    <div class="insp-row">
      <span class="insp-row__label">{$tr("params.variables.insert")}</span>
      <VariableInsertControl selectedObject={primaryText ?? primaryQr ?? primaryBarcode!} valueUpdated={onValueUpdated} />
    </div>
  {/if}

  {#if selectedCount === 1}
    <VectorParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
  {/if}

  <section class="insp-section">
    <h3 class="insp-heading">{$tr("editor.object_settings.arrange")}</h3>
    <div class="insp-more">
      <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
      <button class="btn btn-sm" onclick={onClone} title={$tr("editor.clone")}>
        <MdIcon icon="content_copy" />
      </button>
      <button class="btn btn-sm btn-danger" onclick={onDelete} title={$tr("editor.delete")}>
        <MdIcon icon="delete" />
      </button>
    </div>
  </section>
{:else}
  <section class="insp-section">
    <h3 class="insp-heading">{$tr("editor.object_settings.arrange")}</h3>
    <div class="insp-more">
      <button class="btn btn-sm" onclick={onClone} title={$tr("editor.clone")}>
        <MdIcon icon="content_copy" />
      </button>
      <button class="btn btn-sm btn-danger" onclick={onDelete} title={$tr("editor.delete")}>
        <MdIcon icon="delete" />
      </button>
    </div>
  </section>
{/if}

<style>
  .object-empty {
    color: var(--ws-muted);
    font-size: 13px;
    margin: 16px 0 0;
  }
</style>
