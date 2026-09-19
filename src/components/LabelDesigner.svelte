<script lang="ts">
  import Dropdown from "bootstrap/js/dist/dropdown";
  import * as fabric from "fabric";
  import { onDestroy, onMount, tick } from "svelte";
  import { appConfig, automation, connectionState, csvData, loadedFonts } from "$/stores";
  import {
    type ExportedLabelTemplate,
    type FabricJson,
    type LabelProps,
    type MoveDirection,
    type OjectType,
  } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LabelDesignerObjectHelper } from "$/utils/label_designer_object_helper";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { UndoRedo, type UndoState } from "$/utils/undo_redo";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import PrintPreview from "$/components/PrintPreview.svelte";
  import { DEFAULT_LABEL_PROPS, GRID_SIZE, OBJECT_DEFAULTS } from "$/defaults";
  import { LabelDesignerUtils } from "$/utils/label_designer_utils";
  import SavedLabelsMenu from "$/components/designer-controls/SavedLabelsMenu.svelte";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import { CanvasUtils } from "$/utils/canvas_utils";
  import ElementPalette from "$/components/workspace/ElementPalette.svelte";
  import InspectorPanel from "$/components/workspace/InspectorPanel.svelte";
  import LabelSettingsPanel from "$/components/workspace/LabelSettingsPanel.svelte";
  import ObjectSettingsPanel from "$/components/workspace/ObjectSettingsPanel.svelte";
  import CanvasRulers from "$/components/workspace/CanvasRulers.svelte";
  import { DEFAULT_DPMM, rotateLabelProps } from "$/utils/label_geometry";

  interface Props {
    autoLoad?: boolean;
    onSaved?: () => void;
    onUrlLoaded?: (label: ExportedLabelTemplate) => void;
  }

  let { autoLoad = true, onSaved, onUrlLoaded }: Props = $props();

  let htmlCanvas: HTMLCanvasElement;
  let canvasStage: HTMLDivElement | undefined = $state();
  let canvasHost: HTMLDivElement | undefined = $state();

  let fabricCanvas = $state<CustomCanvas>();
  let labelProps = $state<LabelProps>(DEFAULT_LABEL_PROPS);
  let previewOpened = $state<boolean>(false);
  let selectedObject = $state<fabric.FabricObject | undefined>(undefined);
  let selectedCount = $state<number>(0);
  let editRevision = $state<number>(0);
  let printNow = $state<boolean>(false);
  let csvEnabled = $state<boolean>(false);
  let windowWidth = $state<number>(0);
  let undoState = $state<UndoState>({ undoDisabled: false, redoDisabled: false });
  let zoomRatio = $state(1);
  let zoomInput = $state("100");
  let zoomFocused = $state(false);
  let rulerRevision = $state(0);
  let labelTitle = $state<string>("");
  let savedId = $state<string | undefined>(undefined);
  let pendingLabel = $state<ExportedLabelTemplate | undefined>(undefined);
  let pendingCsvEnabled = $state<boolean | undefined>(undefined);

  const undo = new UndoRedo();

  const discardSelection = () => {
    fabricCanvas!.discardActiveObject();
    fabricCanvas!.requestRenderAll();
    selectedObject = undefined;
    selectedCount = 0;
    editRevision = 0;
  };

  const loadLabelData = async (data: ExportedLabelTemplate) => {
    undo.paused = true;
    onUpdateLabelProps(data.label);
    if (data.csv) {
      $csvData = data.csv;
      csvEnabled = true;
    }
    await FileUtils.loadCanvasState(fabricCanvas!, data.canvas);
    undo.paused = false;
  };

  undo.onLabelUpdate = loadLabelData;
  undo.onStateUpdate = (state: UndoState) => {
    undoState = state;
  };

  const deleteSelected = () => {
    LabelDesignerUtils.deleteSelection(fabricCanvas!);
    discardSelection();
  };

  const cloneSelected = () => {
    LabelDesignerUtils.cloneSelection(fabricCanvas!).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const moveSelected = (direction: MoveDirection, ctrl?: boolean) => {
    LabelDesignerUtils.moveSelection(fabricCanvas!, direction, ctrl);
    undo.push(fabricCanvas!, labelProps);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key: string = e.key.toLowerCase();
    // windows and linux users are used to ctrl, mac users use cmd
    const cmdOrCtrl = e.metaKey || e.ctrlKey;

    // Esc
    if (key === "escape") {
      discardSelection();
      return;
    }

    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    // Arrows
    if (key.startsWith("arrow")) {
      moveSelected(key.slice("arrow".length) as MoveDirection, cmdOrCtrl);
      return;
    }

    if (e.repeat) {
      return;
    }

    // Ctrl + D
    if (cmdOrCtrl && key === "d") {
      e.preventDefault();
      cloneSelected();
      return;
    }

    // Ctrl + Y, Ctrl + Shift + Z
    if ((cmdOrCtrl && key === "y") || (cmdOrCtrl && e.shiftKey && key === "z")) {
      e.preventDefault();
      if (!undoState.redoDisabled) {
        undo.redo();
      }
      return;
    }

    // Ctrl + Z
    if (cmdOrCtrl && key === "z") {
      e.preventDefault();
      if (!undoState.undoDisabled) {
        undo.undo();
      }
      return;
    }

    // Del
    if (key === "delete" || key === "backspace") {
      deleteSelected();
      return;
    }
  };

  const onUpdateLabelProps = (newProps: LabelProps) => {
    labelProps = newProps;
    fabricCanvas!.setDimensions(labelProps.size);
    fabricCanvas!.virtualZoom(fabricCanvas!.getVirtualZoom());
    rulerRevision++;
    try {
      LocalStoragePersistence.saveLastLabelProps(labelProps);
      undo.push(fabricCanvas!, labelProps);
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters save error:");
    }
  };

  const exportCurrentLabel = (): ExportedLabelTemplate => {
    const label = FileUtils.makeExportedLabel(fabricCanvas!, labelProps, csvEnabled);
    label.title = labelTitle || label.title;
    if (savedId) {
      label.id = savedId;
    }
    return label;
  };

  export function getSnapshot(): ExportedLabelTemplate {
    return exportCurrentLabel();
  }

  export function getCsvEnabled(): boolean {
    return csvEnabled;
  }

  export async function applyLabel(data: ExportedLabelTemplate, enableCsv?: boolean) {
    if (!fabricCanvas) {
      pendingLabel = data;
      pendingCsvEnabled = enableCsv;
      return;
    }
    labelTitle = data.title ?? "";
    savedId = data.id?.startsWith("saved_label") ? data.id : undefined;
    csvEnabled = enableCsv ?? !!data.csv;
    await loadLabelData(data);
    undo.push(fabricCanvas!, labelProps);
  }

  const onLoadRequested = (label: ExportedLabelTemplate) => {
    loadLabelData(label).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const zplImageReady = async (img: Blob) => {
    await LabelDesignerObjectHelper.addImageBlob(fabricCanvas!, img);
    undo.push(fabricCanvas!, labelProps);
  };

  const pdfImageReady = async (el: HTMLCanvasElement) => {
    const img = new fabric.FabricImage(el, {
      ...OBJECT_DEFAULTS,
      left: 0,
      top: 0,
    });

    fabricCanvas!.add(img);
    fabricCanvas!.setActiveObject(img);
    undo.push(fabricCanvas!, labelProps);
  };

  const onObjectPicked = (objectType: OjectType) => {
    const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, objectType);
    if (obj !== undefined) {
      fabricCanvas!.setActiveObject(obj);
      undo.push(fabricCanvas!, labelProps);
    }
  };

  const onSvgIconPicked = (i: string) => {
    LabelDesignerObjectHelper.addSvg(fabricCanvas!, i);
    undo.push(fabricCanvas!, labelProps);
  };

  const openPreview = () => {
    printNow = false;
    previewOpened = true;
  };

  const openPreviewAndPrint = () => {
    printNow = true;
    previewOpened = true;
  };

  const controlValueUpdated = () => {
    if (selectedObject) {
      selectedObject.setCoords();
      selectedObject.dirty = true;
      undo.push(fabricCanvas!, labelProps);
    }
    fabricCanvas!.requestRenderAll();

    // trigger reactivity for controls
    editRevision++;
  };

  const getCanvasForPreview = (): FabricJson => {
    return fabricCanvas!.toJSON();
  };

  const onCsvPlaceholderPicked = (name: string) => {
    const obj = LabelDesignerObjectHelper.addText(fabricCanvas!, `{${name}}`, {
      textAlign: "left",
      originX: "left",
      originY: "top",
    });
    fabricCanvas!.setActiveObject(obj);
    undo.push(fabricCanvas!, labelProps);
  };

  const onPaste = async (event: ClipboardEvent) => {
    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    const openedDropdowns = document.querySelectorAll(".dropdown-menu.show");
    if (openedDropdowns.length > 0) {
      return;
    }

    if (event.clipboardData != null) {
      event.preventDefault();
      const obj = await LabelDesignerObjectHelper.addObjectFromClipboard(fabricCanvas!, event.clipboardData);

      if (obj !== undefined) {
        fabricCanvas!.setActiveObject(obj);
        undo.push(fabricCanvas!, labelProps);
      }
    }
  };

  const clearCanvas = () => {
    if (!confirm($tr("editor.clear.confirm"))) {
      return;
    }
    undo.push(fabricCanvas!, labelProps);
    fabricCanvas!.clear();
  };

  const toggleGrid = () => {
    const newVal = !$appConfig.gridEnabled;
    appConfig.update((cfg) => ({ ...cfg, gridEnabled: newVal }));
    fabricCanvas?.setGridEnabled(newVal);
  };

  const loadLabelFromUrl = async () => {
    try {
      const urlTemplate = await FileUtils.readLabelFromUrl();

      if (urlTemplate !== null && confirm($tr("params.saved_labels.load.url.warn"))) {
        if (onUrlLoaded) {
          onUrlLoaded(urlTemplate);
        } else {
          onLoadRequested(urlTemplate);
        }
        Toasts.message($tr("params.saved_labels.load.url.loaded"));
        return true;
      }
    } catch (e) {
      Toasts.error(e);
    }
    return false;
  }

  const loadDefaultLabel = async () => {
    const urlLoaded = await loadLabelFromUrl();

    if (urlLoaded) {
      return;
    }

    if (!autoLoad) {
      return;
    }

    try {
      const defaultTemplate = LocalStoragePersistence.loadDefaultTemplate();

      if (defaultTemplate !== null) {
        onLoadRequested(defaultTemplate);
        return;
      }
    } catch (e) {
      Toasts.error(e);
    }

    LabelDesignerObjectHelper.addText(fabricCanvas!, $tr("editor.default_text"));
  };

  const saveCurrentLabel = () => {
    const label = exportCurrentLabel();
    label.title = labelTitle.trim() || $tr("editor.untitled");
    const saved = LocalStoragePersistence.loadLabels();
    const index = saved.findIndex((item) => item.id === savedId);
    if (index >= 0) {
      saved[index] = label;
    } else {
      saved.push(label);
    }
    const { zodErrors, otherErrors } = LocalStoragePersistence.saveLabels(saved);
    zodErrors.forEach((e) => Toasts.zodErrors(e, "Label save error"));
    otherErrors.forEach((e) => Toasts.error(e));
    if (zodErrors.length === 0 && otherErrors.length === 0) {
      const reloaded = LocalStoragePersistence.loadLabels();
      const match =
        reloaded.find((item) => item.title === label.title && item.timestamp === label.timestamp) ??
        reloaded[reloaded.length - 1];
      savedId = match?.id;
      labelTitle = label.title;
      Toasts.message($tr("editor.save.done"));
      onSaved?.();
    }
  };

  const rotatePaper = () => {
    onUpdateLabelProps(rotateLabelProps(labelProps));
  };

  const applyTypedZoom = () => {
    const parsed = Number.parseFloat(zoomInput.replace("%", "").trim());
    if (!Number.isFinite(parsed)) {
      zoomInput = String(Math.round(zoomRatio * 100));
      return;
    }
    fabricCanvas?.virtualZoom(parsed / 100);
    zoomInput = String(Math.round((fabricCanvas?.getVirtualZoom() ?? parsed / 100) * 100));
  };

  const renderOnFontsChanged = () => {
    fabricCanvas?.forEachObject((o) => {
      if (o instanceof fabric.Textbox) {
        o.dirty = true;
      }
    });
    fabricCanvas?.requestRenderAll();
  };

  onMount(async () => {
    try {
      const savedLabelProps = LocalStoragePersistence.loadLastLabelProps();
      if (savedLabelProps !== null) {
        labelProps = savedLabelProps;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters load error:");
    }

    fabricCanvas = new CustomCanvas(htmlCanvas, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });
    fabricCanvas.setLabelProps(labelProps);
    fabricCanvas.onZoomChange = (z) => {
      zoomRatio = z;
      if (!zoomFocused) {
        zoomInput = String(Math.round(z * 100));
      }
      rulerRevision++;
    };
    fabricCanvas.setGridEnabled(!!$appConfig.gridEnabled);

    if (pendingLabel) {
      const queued = pendingLabel;
      const queuedCsv = pendingCsvEnabled;
      pendingLabel = undefined;
      pendingCsvEnabled = undefined;
      await applyLabel(queued, queuedCsv);
    } else {
      await loadDefaultLabel();
    }

    window.addEventListener("hashchange", loadLabelFromUrl);

    undo.push(fabricCanvas, labelProps);
    rulerRevision++;

    // force close dropdowns on touch devices
    fabricCanvas.on("mouse:down", (): void => {
      const dropdowns = document.querySelectorAll("[data-bs-toggle='dropdown']");
      dropdowns.forEach((el) => new Dropdown(el).hide());
    });

    fabricCanvas.on("object:moving", (e): void => {
      if (e.target && e.target.left !== undefined && e.target.top !== undefined) {
        e.target.set({
          left: Math.round(e.target.left / GRID_SIZE) * GRID_SIZE,
          top: Math.round(e.target.top / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    fabricCanvas.on("object:modified", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("text:changed", () => {
      editRevision++;
    });

    fabricCanvas.on("object:removed", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("selection:created", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
    });

    fabricCanvas.on("selection:updated", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
    });

    fabricCanvas.on("selection:cleared", (): void => {
      selectedObject = undefined;
      selectedCount = 0;
      editRevision++;
    });

    fabricCanvas.on("dragover", (e): void => {
      e.e.preventDefault();
    });

    fabricCanvas.on("drop:after", async (e): Promise<void> => {
      const dragEvt = e.e as DragEvent;
      dragEvt.preventDefault();

      let dropped = false;

      if (dragEvt.dataTransfer?.files) {
        for (const file of dragEvt.dataTransfer.files) {
          try {
            await LabelDesignerObjectHelper.addImageFile(fabricCanvas!, file);
            dropped = true;
          } catch (e) {
            Toasts.error(e);
          }
        }

        if (dropped) {
          undo.push(fabricCanvas!, labelProps);
        }
      }
    });

    fabricCanvas.on("object:scaling", (e): void => {
      if (!e.target) {
        return;
      }

      CanvasUtils.fixFabricObjectScale(e.target);
    });

    // userFonts.subscribe((e) => {console.log(e); renderOnFontsChanged();});

    if ($automation !== undefined) {
      if ($automation.startPrint !== undefined) {
        if ($automation.startPrint === "immediately") {
          openPreview();
        } else if ($automation.startPrint === "after_connect") {
          const unsubscribe = connectionState.subscribe((st) => {
            if (st === "connected") {
              tick().then(() => unsubscribe());
              openPreviewAndPrint();
            }
          });
        }
      }
    }
  });

  onDestroy(() => {
    fabricCanvas!.dispose();
    window.removeEventListener("hashchange", loadLabelFromUrl);
  });

  $effect(() => {
    fabricCanvas?.setLabelProps(labelProps);
  });

  $effect(() => {
    fabricCanvas?.setGridEnabled(!!$appConfig.gridEnabled);
  });

  $effect(() => {
    if (!previewOpened) {
      printNow = false;
    }
  });

  $effect(() => {
    if ($loadedFonts) {
      renderOnFontsChanged();
    }
  });
</script>

<svelte:window bind:innerWidth={windowWidth} onkeydown={onKeyDown} onpaste={onPaste} />

<div class="image-editor designer-root">
  <div class="workspace-toolbar">
    <button class="ws-btn ws-btn-ghost" disabled={undoState.undoDisabled} onclick={() => undo.undo()}>
      <MdIcon icon="undo" />
      {$tr("editor.recover")}
    </button>
    <button class="ws-btn ws-btn-ghost" disabled={undoState.redoDisabled} onclick={() => undo.redo()} title={$tr("editor.redo")}>
      <MdIcon icon="redo" />
    </button>
    <button class="ws-btn ws-btn-ghost" onclick={clearCanvas} title={$tr("editor.clear")}>
      <MdIcon icon="cancel_presentation" />
    </button>
    <SavedLabelsMenu canvas={fabricCanvas!} onRequestLabelTemplate={exportCurrentLabel} {onLoadRequested} {csvEnabled} />
    <div class="workspace-toolbar__spacer"></div>
    <button class="ws-btn" onclick={openPreview}>
      <MdIcon icon="visibility" />
      {$tr("editor.preview")}
    </button>
    <button class="ws-btn" onclick={saveCurrentLabel}>
      <MdIcon icon="save" />
      {$tr("editor.save")}
    </button>
    <button class="ws-btn ws-btn-primary" onclick={openPreviewAndPrint} disabled={$connectionState !== "connected"}>
      <MdIcon icon="print" />
      {$tr("editor.print")}
    </button>
  </div>

  <div class="designer-workspace">
    <ElementPalette
      {labelProps}
      bind:csvEnabled
      onPick={onObjectPicked}
      {onSvgIconPicked}
      {onCsvPlaceholderPicked}
      {zplImageReady}
      {pdfImageReady} />

    <div class="designer-canvas-pane">
      <div class="designer-canvas-stage" bind:this={canvasStage}>
        <CanvasRulers
          container={canvasStage}
          target={canvasHost}
          dpmm={DEFAULT_DPMM}
          zoom={zoomRatio}
          printDirection={labelProps.printDirection}
          revision={rulerRevision} />
        <div class="canvas-wrapper print-start-{labelProps.printDirection}" bind:this={canvasHost}>
          <canvas bind:this={htmlCanvas}></canvas>
        </div>
      </div>
      <div class="designer-canvas-footer">
        <div class="zoom-control">
          <button
            type="button"
            title={$tr("editor.zoom.out")}
            disabled={zoomRatio <= 0.25}
            onclick={() => fabricCanvas?.virtualZoomOut()}>
            <MdIcon icon="zoom_out" />
          </button>
          <input
            type="text"
            inputmode="decimal"
            aria-label={$tr("editor.zoom")}
            value={zoomInput}
            onfocus={() => (zoomFocused = true)}
            oninput={(e) => (zoomInput = e.currentTarget.value)}
            onblur={() => {
              zoomFocused = false;
              applyTypedZoom();
            }}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }} />
          <span class="zoom-control__suffix">%</span>
          <button
            type="button"
            title={$tr("editor.zoom.in")}
            disabled={zoomRatio >= 4}
            onclick={() => fabricCanvas?.virtualZoomIn()}>
            <MdIcon icon="zoom_in" />
          </button>
        </div>
        <button class="ws-btn" onclick={rotatePaper}>
          <MdIcon icon="rotate_right" />
          {$tr("editor.rotate")}
        </button>
      </div>
    </div>

    <InspectorPanel {selectedCount}>
      {#snippet label()}
        <LabelSettingsPanel {labelProps} bind:title={labelTitle} onChange={onUpdateLabelProps} onTitleChange={(value) => (labelTitle = value)} />
      {/snippet}
      {#snippet object()}
        <ObjectSettingsPanel
          {selectedObject}
          {selectedCount}
          {editRevision}
          onDelete={deleteSelected}
          onClone={cloneSelected}
          onValueUpdated={controlValueUpdated} />
      {/snippet}
    </InspectorPanel>
  </div>

  {#if previewOpened}
    <PrintPreview
      bind:show={previewOpened}
      canvasCallback={getCanvasForPreview}
      {labelProps}
      {printNow}
      {csvEnabled}
      csvData={$csvData.data}
      labelTitle={labelTitle}
      sourceId={savedId} />
  {/if}
</div>

<style>
  .designer-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 0;
    flex: 1;
  }

  .canvas-wrapper {
    border: 0;
    background-color: transparent;
    max-width: 100%;
    max-height: 100%;
    overflow: auto;
  }
  .canvas-wrapper.print-start-left {
    border-left: 2px solid #ff4646;
  }
  .canvas-wrapper.print-start-top {
    border-top: 2px solid #ff4646;
  }
  .canvas-wrapper canvas {
    image-rendering: pixelated;
    display: block;
  }
</style>
