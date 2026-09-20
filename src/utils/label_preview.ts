import "$/fabric-object/aruco";
import "$/fabric-object/barcode";
import "$/fabric-object/qrcode";
import type { ExportedLabelTemplate, FabricJson, LabelProps } from "$/types";
import { CustomCanvas } from "$/fabric-object/custom_canvas";
import { FileUtils } from "$/utils/file_utils";
import { canvasPreprocess } from "$/utils/canvas_preprocess";

const previewCache = new Map<string, Promise<string>>();

const previewKey = (label: ExportedLabelTemplate): string => {
  if (label.thumbnailBase64) {
    return `saved:${label.id ?? ""}:${label.timestamp ?? 0}:${label.thumbnailBase64.length}`;
  }
  return JSON.stringify({
    id: label.id,
    timestamp: label.timestamp,
    size: label.label.size,
    objects: label.canvas?.objects ?? [],
  });
};

export async function renderLabelPreviewImage(label: ExportedLabelTemplate): Promise<string> {
  if (label.thumbnailBase64) {
    return label.thumbnailBase64;
  }

  const key = previewKey(label);
  const cached = previewCache.get(key);
  if (cached) {
    return cached;
  }

  const pending = renderFromCanvas(label).catch((error) => {
    previewCache.delete(key);
    throw error;
  });
  previewCache.set(key, pending);
  return pending;
}

async function renderFromCanvas(label: ExportedLabelTemplate): Promise<string> {
  const width = Math.max(1, label.label.size.width);
  const height = Math.max(1, label.label.size.height);
  const canvas = new CustomCanvas(undefined, {
    width,
    height,
    enableRetinaScaling: false,
  });

  try {
    canvas.setCustomBackground(false);
    canvas.setHighlightMirror(false);
    canvas.setLabelProps(label.label);
    await FileUtils.loadCanvasState(canvas, label.canvas);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width, height });
    canvas.requestRenderAll();
    return FileUtils.makeLabelThumbnail(canvas);
  } finally {
    canvas.dispose();
  }
}

export async function renderCsvPageThumbnail(
  template: FabricJson,
  labelProps: LabelProps,
  variables: { [key: string]: string },
): Promise<string> {
  const width = Math.max(1, labelProps.size.width);
  const height = Math.max(1, labelProps.size.height);
  const canvas = new CustomCanvas(undefined, {
    width,
    height,
    enableRetinaScaling: false,
  });

  try {
    canvas.setCustomBackground(false);
    canvas.setHighlightMirror(false);
    canvas.setLabelProps(labelProps);
    await FileUtils.loadCanvasState(canvas, template);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setDimensions({ width, height });
    canvasPreprocess(canvas, variables);
    canvas.requestRenderAll();
    return FileUtils.makeLabelThumbnail(canvas);
  } finally {
    canvas.dispose();
  }
}
