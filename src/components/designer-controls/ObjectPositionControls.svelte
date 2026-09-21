<script lang="ts">
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  import { alignObjects, type ObjectAlign } from "$/utils/object_align";
  import * as fabric from "fabric";
  import { onDestroy } from "svelte";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision?: number;
    valueUpdated?: () => void;
  }

  let { selectedObject, editRevision = 0, valueUpdated }: Props = $props();
  let prevObject: fabric.FabricObject | undefined;

  let x = $state<number>();
  let y = $state<number>();
  let width = $state<number>();
  let height = $state<number>();
  let widthScaled = $state<number>();
  let heightScaled = $state<number>();
  let angle = $state(0);
  let keepAspectRatio = $state<boolean>(false);

  const canResizeBox = $derived(
    !(
      selectedObject instanceof fabric.FabricText ||
      selectedObject instanceof fabric.FabricImage ||
      selectedObject instanceof QRCode ||
      selectedObject instanceof Barcode
    ),
  );
  const isImage = $derived(selectedObject instanceof fabric.FabricImage);

  const targets = $derived.by(() => {
    const active = selectedObject.canvas?.getActiveObjects();
    if (active && active.length > 0) {
      return active;
    }
    if (selectedObject instanceof fabric.ActiveSelection) {
      return selectedObject.getObjects();
    }
    return [selectedObject];
  });

  const notify = () => {
    valueUpdated?.();
  };

  const objectDimensionsChanged = (e?: fabric.ModifiedEvent) => {
    const pos = selectedObject.getPointByOrigin("left", "top");
    x = Math.round(pos.x);
    y = Math.round(pos.y);
    width = selectedObject.width;
    height = selectedObject.height;
    angle = Math.round((((selectedObject.angle ?? 0) % 360) + 360) % 360);
    updateScales(e?.action);
  };

  const objectChanged = (newObject: fabric.FabricObject) => {
    if (prevObject !== undefined) {
      prevObject.off("modified", objectDimensionsChanged);
    }

    newObject.on("modified", objectDimensionsChanged);
    objectDimensionsChanged();
    prevObject = newObject;
  };

  const renderObject = () => {
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
    notify();
  };

  const updateObject = (e: Event, source?: "width" | "height") => {
    const nextX = Number.isFinite(x) ? Math.round(x!) : 0;
    const nextY = Number.isFinite(y) ? Math.round(y!) : 0;
    selectedObject.setPositionByOrigin(new fabric.Point(nextX, nextY), "left", "top");

    if (selectedObject instanceof fabric.FabricImage) {
      if (keepAspectRatio) {
        const scale = source === "width" ? widthScaled! / selectedObject.width! : heightScaled! / selectedObject.height!;
        selectedObject.scaleX = scale;
        selectedObject.scaleY = scale;
      } else {
        selectedObject.scaleX = widthScaled! / selectedObject.width!;
        selectedObject.scaleY = heightScaled! / selectedObject.height!;
      }
      updateScales();
    } else if (canResizeBox) {
      selectedObject.set({
        width: Math.round(Math.max(width!, 1)),
        height: Math.round(Math.max(height!, 1)),
      });
    }

    renderObject();
  };

  const applyAngle = () => {
    const next = Number.isFinite(angle) ? angle : 0;
    selectedObject.rotate((((next % 360) + 360) % 360));
    objectDimensionsChanged();
    renderObject();
  };

  const flipHorizontal = () => {
    selectedObject.set("flipX", !selectedObject.flipX);
    renderObject();
  };

  const flipVertical = () => {
    selectedObject.set("flipY", !selectedObject.flipY);
    renderObject();
  };

  const rotate180 = () => {
    selectedObject.rotate((selectedObject.angle + 180) % 360);
    objectDimensionsChanged();
    renderObject();
  };

  const alignSelection = (align: ObjectAlign) => {
    if (targets.length === 0) {
      return;
    }
    alignObjects(targets, align);
    objectDimensionsChanged();
    notify();
  };

  const toggleAspectRatio = (e: Event) => {
    if (keepAspectRatio) {
      selectedObject.scaleX = Math.min(selectedObject.scaleX, selectedObject.scaleY);
      selectedObject.scaleY = selectedObject.scaleX;
      updateScales();
      updateObject(e);
    }
  };

  const updateScales = (action?: string) => {
    widthScaled = Math.round(width! * selectedObject.scaleX);
    heightScaled = Math.round(height! * selectedObject.scaleY);

    if (action === "scaleX" || action === "scaleY") keepAspectRatio = false;
    if ((action === "scale" || action === undefined) && selectedObject.scaleX === selectedObject.scaleY) keepAspectRatio = true;
  };

  onDestroy(() => selectedObject.off("modified", objectDimensionsChanged));

  $effect(() => {
    void editRevision;
    objectChanged(selectedObject);
  });
</script>

<section class="insp-section">
  <h3 class="insp-heading">{$tr("editor.object_settings.align")}</h3>

  <div class="insp-tools insp-pos-align">
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

  <div class="insp-subhead">{$tr("params.generic.position")}</div>
  <div class="insp-pos-grid">
    <label class="insp-xy">
      <span>X</span>
      <input type="number" inputmode="decimal" aria-label="X" bind:value={x} onchange={updateObject} />
    </label>
    <label class="insp-xy">
      <span>Y</span>
      <input type="number" inputmode="decimal" aria-label="Y" bind:value={y} onchange={updateObject} />
    </label>
  </div>

  {#if canResizeBox}
    <div class="insp-pos-grid">
      <label class="insp-xy">
        <span>W</span>
        <input type="number" inputmode="decimal" min="1" aria-label="W" bind:value={width} onchange={updateObject} />
      </label>
      <label class="insp-xy">
        <span>H</span>
        <input type="number" inputmode="decimal" min="1" aria-label="H" bind:value={height} onchange={updateObject} />
      </label>
    </div>
  {/if}

  {#if isImage}
    <div class="insp-pos-grid">
      <label class="insp-xy">
        <span>W</span>
        <input type="number" inputmode="decimal" min="1" aria-label="W" bind:value={widthScaled} onchange={(e) => updateObject(e, "width")} />
      </label>
      <label class="insp-xy">
        <span>H</span>
        <input type="number" inputmode="decimal" min="1" aria-label="H" bind:value={heightScaled} onchange={(e) => updateObject(e, "height")} />
      </label>
    </div>
    <label class="insp-check">
      <input type="checkbox" bind:checked={keepAspectRatio} onchange={toggleAspectRatio} />
      <span>{$tr("params.generic.keepAspectRatio")}</span>
    </label>
  {/if}

  <div class="insp-subhead">{$tr("params.generic.rotation")}</div>
  <div class="insp-pos-rotate">
    <label class="insp-xy">
      <span>°</span>
      <input type="number" inputmode="decimal" aria-label={$tr("params.generic.rotation")} bind:value={angle} onchange={applyAngle} />
    </label>
    <div class="insp-fmt">
      <button type="button" title={$tr("params.generic.flip.horizontal")} onclick={flipHorizontal}>
        <MdIcon icon="flip" />
      </button>
      <button type="button" title={$tr("params.generic.flip.vertical")} onclick={flipVertical}>
        <MdIcon icon="flip_vertical" />
      </button>
      <button type="button" title={$tr("params.generic.rotate_180")} onclick={rotate180}>
        <MdIcon icon="refresh" />
      </button>
    </div>
  </div>
</section>
