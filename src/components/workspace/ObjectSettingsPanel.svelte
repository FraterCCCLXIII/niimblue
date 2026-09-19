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

  interface Props {
    selectedObject?: fabric.FabricObject;
    selectedCount: number;
    editRevision: number;
    onDelete: () => void;
    onClone: () => void;
    onValueUpdated: () => void;
  }

  let { selectedObject, selectedCount, editRevision, onDelete, onClone, onValueUpdated }: Props = $props();
</script>

{#if selectedCount === 0}
  <p class="object-empty">{$tr("editor.object_settings.empty")}</p>
{:else}
  {#if selectedObject instanceof fabric.IText}
    <TextParamsControls selectedText={selectedObject} {editRevision} valueUpdated={onValueUpdated} />
  {/if}

  {#if selectedObject instanceof QRCode}
    <QrCodeParamsPanel selectedQRCode={selectedObject} {editRevision} valueUpdated={onValueUpdated} />
  {/if}
  {#if selectedObject instanceof ArUcoMarker}
    <ArUcoParamsPanel selectedArUco={selectedObject} {editRevision} valueUpdated={onValueUpdated} />
  {/if}
  {#if selectedObject instanceof Barcode}
    <BarcodeParamsPanel selectedBarcode={selectedObject} {editRevision} valueUpdated={onValueUpdated} />
  {/if}

  {#if selectedObject instanceof fabric.IText || selectedObject instanceof QRCode || (selectedObject instanceof Barcode && selectedObject.encoding === "CODE128B")}
    <div class="insp-row">
      <span class="insp-row__label">{$tr("params.variables.insert")}</span>
      <VariableInsertControl {selectedObject} valueUpdated={onValueUpdated} />
    </div>
  {/if}

  {#if selectedObject}
    <VectorParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
    <section class="insp-section">
      <h3 class="insp-heading">{$tr("editor.object_settings.arrange")}</h3>
      <div class="insp-more">
        {#if selectedCount === 1}
          <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={onValueUpdated} />
        {/if}
        <button class="btn btn-sm" onclick={onClone} title={$tr("editor.clone")}>
          <MdIcon icon="content_copy" />
        </button>
        <button class="btn btn-sm btn-danger" onclick={onDelete} title={$tr("editor.delete")}>
          <MdIcon icon="delete" />
        </button>
      </div>
    </section>
  {/if}
{/if}

<style>
  .object-empty {
    color: var(--ws-muted);
    font-size: 13px;
    margin: 16px 0 0;
  }
</style>
