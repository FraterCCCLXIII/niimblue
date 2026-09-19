<script lang="ts">
  import { tr } from "$/utils/i18n";
  import * as fabric from "fabric";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }

  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const isShape =
    selectedObject instanceof fabric.Rect ||
    selectedObject instanceof fabric.Circle ||
    selectedObject instanceof fabric.Line ||
    selectedObject instanceof fabric.Polyline;

  const roundRadiusChanged = (value: number) => {
    const rect = selectedObject as fabric.Rect;
    rect.set({
      rx: value,
      ry: value,
    });
    valueUpdated();
  };

  const strokeWidthChanged = (value: number) => {
    selectedObject.set({ strokeWidth: value });
    valueUpdated();
  };

  const fillChanged = (value: string) => {
    selectedObject.set({ fill: value });
    valueUpdated();
  };
</script>

<input type="hidden" value={editRevision} />

{#if selectedObject instanceof fabric.Rect}
  <div class="insp-row">
    <span class="insp-row__label">{$tr("params.vector.round_radius")}</span>
    <input
      type="number"
      min="0"
      max={Math.min(selectedObject.width, selectedObject.height) / 2}
      class="insp-field insp-field-narrow"
      value={selectedObject.rx}
      oninput={(e) => roundRadiusChanged(e.currentTarget.valueAsNumber)} />
  </div>
{/if}

{#if isShape}
  <div class="insp-row">
    <span class="insp-row__label">{$tr("params.vector.stroke_width")}</span>
    <input
      type="number"
      min="1"
      class="insp-field insp-field-narrow"
      value={selectedObject.strokeWidth}
      oninput={(e) => strokeWidthChanged(e.currentTarget.valueAsNumber)} />
  </div>
{/if}

{#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle}
  <div class="insp-row">
    <span class="insp-row__label">{$tr("params.vector.fill")}</span>
    <select class="insp-field insp-select insp-field-narrow" value={selectedObject.fill} onchange={(e) => fillChanged(e.currentTarget.value)}>
      <option value="transparent">{$tr("params.color.transparent")}</option>
      <option value="white">{$tr("params.color.white")}</option>
      <option value="black">{$tr("params.color.black")}</option>
    </select>
  </div>
{/if}

<style>
  .insp-field-narrow {
    width: 108px;
  }
</style>
