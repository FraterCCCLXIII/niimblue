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
  import { alignObjects, type ObjectAlign } from "$/utils/object_align";

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
    const active = selectedObject.canvas?.getActiveObjects();
    if (active && active.length > 0) {
      return active;
    }
    if (selectedObject instanceof fabric.ActiveSelection) {
      return selectedObject.getObjects();
    }
    return [selectedObject];
  });

  const textTargets = $derived(targets.filter((obj): obj is fabric.IText => obj instanceof fabric.IText));
  const primaryText = $derived(textTargets.length > 0 && textTargets.length === targets.length ? textTargets[0] : undefined);
  const primaryQr = $derived(targets.length === 1 && targets[0] instanceof QRCode ? targets[0] : undefined);
  const primaryAruco = $derived(targets.length === 1 && targets[0] instanceof ArUcoMarker ? targets[0] : undefined);
  const primaryBarcode = $derived(targets.length === 1 && targets[0] instanceof Barcode ? targets[0] : undefined);
  const showVariables = $derived(
    targets.length === 1 && (!!primaryText || !!primaryQr || (primaryBarcode != null && primaryBarcode.encoding === "CODE128B")),
  );

  const alignSelection = (align: ObjectAlign) => {
    if (targets.length === 0) {
      return;
    }
    alignObjects(targets, align);
    onValueUpdated();
  };
</script>

{#if selectedCount === 0}
  <p class="object-empty">{$tr("editor.object_settings.empty")}</p>
{:else if selectedObject}
  {#if primaryText}
    <TextParamsControls selectedText={primaryText} {textTargets} {editRevision} valueUpdated={onValueUpdated} />
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
    <h3 class="insp-heading">{$tr("editor.object_settings.align")}</h3>
    <div class="insp-tools insp-tools--stack">
      <div class="insp-group">
        <button type="button" title={$tr("editor.object_settings.align.left")} onclick={() => alignSelection("left")}>
          <MdIcon icon="align_horizontal_left" />
        </button>
        <button type="button" title={$tr("editor.object_settings.align.center")} onclick={() => alignSelection("center")}>
          <MdIcon icon="align_horizontal_center" />
        </button>
        <button type="button" title={$tr("editor.object_settings.align.right")} onclick={() => alignSelection("right")}>
          <MdIcon icon="align_horizontal_right" />
        </button>
      </div>
      <div class="insp-group">
        <button type="button" title={$tr("editor.object_settings.align.top")} onclick={() => alignSelection("top")}>
          <MdIcon icon="align_vertical_top" />
        </button>
        <button type="button" title={$tr("editor.object_settings.align.middle")} onclick={() => alignSelection("middle")}>
          <MdIcon icon="align_vertical_center" />
        </button>
        <button type="button" title={$tr("editor.object_settings.align.bottom")} onclick={() => alignSelection("bottom")}>
          <MdIcon icon="align_vertical_bottom" />
        </button>
      </div>
    </div>
  </section>

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
