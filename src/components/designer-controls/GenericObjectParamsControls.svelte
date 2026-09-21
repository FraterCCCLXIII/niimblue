<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Button, Menu, SelectField } from "$/components/ui";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";

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
    selectedObject.canvas?.requestRenderAll();
    valueUpdated();
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

<input type="hidden" value={editRevision} />

<Button size="sm" pill={false} onclick={putToCenterV} title={$tr("params.generic.center.vertical")}>
  <MdIcon icon="vertical_distribute" />
</Button>
<Button size="sm" pill={false} onclick={putToCenterH} title={$tr("params.generic.center.horizontal")}>
  <MdIcon icon="horizontal_distribute" />
</Button>

<Menu class="p-2 text-center">
  {#snippet trigger({ toggle })}
    <Button size="sm" pill={false} title={$tr("params.generic.arrange")} onclick={toggle}>
      <MdIcon icon="segment" />
    </Button>
  {/snippet}
  <div class="flex flex-col gap-1">
    <Button size="sm" pill={false} onclick={() => bringTo("top")}>
      {$tr("params.generic.arrange.top")}
    </Button>
    <Button size="sm" pill={false} onclick={() => bringTo("bottom")}>
      {$tr("params.generic.arrange.bottom")}
    </Button>
  </div>
</Menu>

{#if selectedObject instanceof fabric.FabricImage}
  <div class="flex">
    <Button size="sm" pill={false} class="rounded-r-none" onclick={fit} title={$tr("params.generic.fit")}>
      <MdIcon icon="fit_screen" />
    </Button>
    <Menu closeOnSelect={false} class="p-1">
      {#snippet trigger({ toggle })}
        <Button size="sm" pill={false} class="-ml-px rounded-l-none px-1" aria-label="Toggle" onclick={toggle}>
          <MdIcon icon="expand_more" />
        </Button>
      {/snippet}
      <SelectField class="min-h-8 text-[13px]" value={$appConfig.fitMode ?? "stretch"} onchange={fitModeChanged}>
        <option value="stretch">{$tr("params.generic.fit.mode.stretch")}</option>
        <option value="ratio_min">{$tr("params.generic.fit.mode.ratio_min")}</option>
        <option value="ratio_max">{$tr("params.generic.fit.mode.ratio_max")}</option>
      </SelectField>
    </Menu>
  </div>
{/if}
