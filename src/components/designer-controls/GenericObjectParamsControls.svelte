<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPositionControls from "$/components/designer-controls/ObjectPositionControls.svelte";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import { fixedDropdown } from "$/utils/fixed_dropdown";


  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const putToCenterV = () => {
    selectedObject.canvas!.centerObjectV(selectedObject);
    valueUpdated();
  };

  const putToCenterH = () => {
    selectedObject.canvas!.centerObjectH(selectedObject);
    valueUpdated();
  };

  const bringTo = (to: "top" | "bottom") => {
    if (to === "top") {
      selectedObject.canvas?.bringObjectToFront(selectedObject);
    } else if (to === "bottom") {
      selectedObject.canvas?.sendObjectToBack(selectedObject);
    }
  };

  const fit = () => {
    const canvas = selectedObject.canvas!;
    const size = canvas instanceof CustomCanvas ? canvas.getLabelSize() : { width: canvas.getWidth(), height: canvas.getHeight() };
    const imageRatio = selectedObject.width / selectedObject.height;
    const canvasRatio = size.width / size.height;

    if ($appConfig.fitMode === "ratio_min") {
      if (imageRatio > canvasRatio) {
        selectedObject.scaleToWidth(size.width);
      } else {
        selectedObject.scaleToHeight(size.height);
      }
      canvas.centerObject(selectedObject);
    } else if ($appConfig.fitMode === "ratio_max") {
      if (imageRatio > canvasRatio) {
        selectedObject.scaleToHeight(size.height);
      } else {
        selectedObject.scaleToWidth(size.width);
      }
      canvas.centerObject(selectedObject);
    } else {
      selectedObject.set({
        left: 0,
        top: 0,
        scaleX: size.width / selectedObject.width,
        scaleY: size.height / selectedObject.height,
      });
    }
    valueUpdated();
  };

  const fitModeChanged = (e: Event & { currentTarget: HTMLSelectElement }) => {
    const fitMode = e.currentTarget.value as "stretch" | "ratio_min" | "ratio_max";
    appConfig.update((v) => ({ ...v, fitMode: fitMode }));
  };
</script>

<input type="hidden" value={editRevision}>

<button class="btn btn-sm btn-secondary" onclick={putToCenterV} title={$tr("params.generic.center.vertical")}>
  <MdIcon icon="vertical_distribute" />
</button>
<button class="btn btn-sm btn-secondary" onclick={putToCenterH} title={$tr("params.generic.center.horizontal")}>
  <MdIcon icon="horizontal_distribute" />
</button>

<ObjectPositionControls {selectedObject} />

<div class="dropdown">
  <button
    class="btn btn-sm btn-secondary dropdown-toggle"
    type="button"
    data-bs-toggle="dropdown"
    use:fixedDropdown
    title={$tr("params.generic.arrange")}>
    <MdIcon icon="segment" />
  </button>
  <div class="dropdown-menu arrangement p-2">
    <button class="btn btn-sm" onclick={() => bringTo("top")}>
      {$tr("params.generic.arrange.top")}
    </button>
    <button class="btn btn-sm" onclick={() => bringTo("bottom")}>
      {$tr("params.generic.arrange.bottom")}
    </button>
  </div>
</div>

{#if selectedObject instanceof fabric.FabricImage}
  <div class="btn-group btn-group-sm">
    <button type="button" class="btn btn-secondary" onclick={fit} title={$tr("params.generic.fit")}>
      <MdIcon icon="fit_screen" />
    </button>
    <button
      aria-label="Toggle"
      type="button"
      class="btn btn-secondary dropdown-toggle dropdown-toggle-split px-1"
      data-bs-toggle="dropdown"
      use:fixedDropdown></button>
    <div class="dropdown-menu p-1">
      <select class="form-select form-select-sm" value={$appConfig.fitMode ?? "stretch"} onchange={fitModeChanged}>
        <option value="stretch">{$tr("params.generic.fit.mode.stretch")}</option>
        <option value="ratio_min">{$tr("params.generic.fit.mode.ratio_min")}</option>
        <option value="ratio_max">{$tr("params.generic.fit.mode.ratio_max")}</option>
      </select>
    </div>
  </div>
{/if}

<style>
  .dropdown-menu.arrangement {
    text-align: center;
  }
</style>
