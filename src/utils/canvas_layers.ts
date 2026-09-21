import * as fabric from "fabric";
import { ArUcoMarker } from "$/fabric-object/aruco";
import { Barcode } from "$/fabric-object/barcode";
import { QRCode } from "$/fabric-object/qrcode";
import type { AppIconName } from "$/utils/lucide_icons";
import { getBoundText } from "$/utils/csv_preview";

export type LayerKind =
  | "text"
  | "image"
  | "barcode"
  | "qrcode"
  | "aruco"
  | "line"
  | "circle"
  | "rectangle"
  | "icon"
  | "group";

export type DesignerLayer = {
  key: string;
  object: fabric.FabricObject;
  kind: LayerKind;
  preview: string;
  selected: boolean;
};

const layerIds = new WeakMap<fabric.FabricObject, string>();
let nextLayerId = 1;

export const layerKey = (obj: fabric.FabricObject): string => {
  let id = layerIds.get(obj);
  if (!id) {
    id = `layer_${nextLayerId++}`;
    layerIds.set(obj, id);
  }
  return id;
};

const collapse = (value: string, max = 32): string => {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
};

export const getLayerKind = (obj: fabric.FabricObject): LayerKind => {
  if (obj instanceof QRCode) {
    return "qrcode";
  }
  if (obj instanceof Barcode) {
    return "barcode";
  }
  if (obj instanceof ArUcoMarker) {
    return "aruco";
  }
  if (obj instanceof fabric.IText || obj instanceof fabric.FabricText) {
    return "text";
  }
  if (obj instanceof fabric.Circle) {
    return "circle";
  }
  if (obj instanceof fabric.Rect) {
    return "rectangle";
  }
  if (obj instanceof fabric.Polyline || obj instanceof fabric.Line) {
    return "line";
  }
  if (obj instanceof fabric.FabricImage) {
    return "image";
  }
  if (obj instanceof fabric.Group) {
    return "icon";
  }
  return "group";
};

export const getLayerPreview = (obj: fabric.FabricObject): string => {
  const bound = getBoundText(obj);
  if (bound) {
    return collapse(bound);
  }
  if (obj instanceof ArUcoMarker) {
    return collapse(`${obj.dictionary} #${obj.markerId}`);
  }
  return "";
};

export const getLayerIcon = (kind: LayerKind): AppIconName => {
  switch (kind) {
    case "text":
      return "title";
    case "image":
      return "image";
    case "barcode":
      return "view_week";
    case "qrcode":
    case "aruco":
      return "qr_code_2";
    case "line":
      return "horizontal_rule";
    case "circle":
      return "radio_button_unchecked";
    case "rectangle":
      return "border_all";
    case "icon":
      return "emoji_emotions";
    case "group":
      return "widgets";
  }
};

export const listCanvasLayers = (canvas?: fabric.Canvas): DesignerLayer[] => {
  if (!canvas) {
    return [];
  }
  const selected = new Set(canvas.getActiveObjects());
  return [...canvas.getObjects()].reverse().map((object) => ({
    key: layerKey(object),
    object,
    kind: getLayerKind(object),
    preview: getLayerPreview(object),
    selected: selected.has(object),
  }));
};

/** Move an item in a front-to-back list. `insertBefore` is the drop index (0..length). */
export const moveLayer = <T>(items: T[], from: number, insertBefore: number): T[] => {
  if (from < 0 || from >= items.length || insertBefore < 0 || insertBefore > items.length) {
    return items;
  }
  if (insertBefore === from || insertBefore === from + 1) {
    return items;
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  const dest = insertBefore > from ? insertBefore - 1 : insertBefore;
  next.splice(dest, 0, item);
  return next;
};

type StackingCanvas = fabric.Canvas & {
  moveObjectTo?: (object: fabric.FabricObject, index: number) => unknown;
};

const moveCanvasObjectTo = (canvas: fabric.Canvas, obj: fabric.FabricObject, index: number) => {
  const stacking = canvas as StackingCanvas;
  if (typeof stacking.moveObjectTo === "function") {
    stacking.moveObjectTo(obj, index);
    return;
  }

  const objects = canvas.getObjects();
  const current = objects.indexOf(obj);
  if (current === -1 || current === index) {
    return;
  }
  if (index <= 0) {
    canvas.sendObjectToBack(obj);
    return;
  }
  if (index >= objects.length - 1) {
    canvas.bringObjectToFront(obj);
    return;
  }

  let guard = objects.length + 2;
  while (canvas.getObjects().indexOf(obj) < index && guard-- > 0) {
    canvas.bringObjectForward(obj);
  }
  guard = objects.length + 2;
  while (canvas.getObjects().indexOf(obj) > index && guard-- > 0) {
    canvas.sendObjectBackwards(obj);
  }
};

/** Apply a front-to-back layer list to canvas z-order (index 0 is the front). */
export const applyCanvasLayerOrder = (canvas: fabric.Canvas, frontToBack: fabric.FabricObject[]) => {
  const desired = [...frontToBack].reverse();
  desired.forEach((obj, index) => {
    if (canvas.getObjects()[index] !== obj) {
      moveCanvasObjectTo(canvas, obj, index);
    }
  });
  canvas.requestRenderAll();
};
