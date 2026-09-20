import * as fabric from "fabric";
import { CustomCanvas } from "$/fabric-object/custom_canvas";

export type ObjectAlign = "left" | "center" | "right" | "top" | "middle" | "bottom";

type AlignBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

const visualBox = (obj: fabric.FabricObject) => {
  obj.setCoords();
  return obj.getBoundingRect();
};

const boundingBox = (objects: fabric.FabricObject[]): AlignBox & { rects: ReturnType<fabric.FabricObject["getBoundingRect"]>[] } => {
  const rects = objects.map(visualBox);
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));
  return { rects, left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
};

/** Illustrator Align-to-Selection / Align-to-Artboard: one axis only. */
const deltaForAlign = (
  align: ObjectAlign,
  rect: { left: number; top: number; width: number; height: number },
  bounds: AlignBox,
): { dx: number; dy: number } => {
  // Horizontal Align Left / Center / Right — Y stays put.
  if (align === "left") {
    return { dx: bounds.left - rect.left, dy: 0 };
  }
  if (align === "center") {
    return { dx: bounds.centerX - (rect.left + rect.width / 2), dy: 0 };
  }
  if (align === "right") {
    return { dx: bounds.right - (rect.left + rect.width), dy: 0 };
  }
  // Vertical Align Top / Center / Bottom — X stays put.
  if (align === "top") {
    return { dx: 0, dy: bounds.top - rect.top };
  }
  if (align === "middle") {
    return { dx: 0, dy: bounds.centerY - (rect.top + rect.height / 2) };
  }
  return { dx: 0, dy: bounds.bottom - (rect.top + rect.height) };
};

/** Translate in canvas space and write only the axis that actually moved. */
const translateOnCanvas = (obj: fabric.FabricObject, dx: number, dy: number) => {
  if (dx === 0 && dy === 0) {
    return;
  }
  const current = obj.getXY();
  obj.setXY(new fabric.Point(dx !== 0 ? current.x + dx : current.x, dy !== 0 ? current.y + dy : current.y));
  obj.dirty = true;
  obj.setCoords();
};

const labelBoundsAsBox = (canvas: fabric.Canvas): AlignBox => {
  if (canvas instanceof CustomCanvas) {
    const bounds = canvas.getLabelBounds();
    return {
      left: bounds.startX,
      top: bounds.startY,
      right: bounds.endX,
      bottom: bounds.endY,
      centerX: bounds.startX + bounds.width / 2,
      centerY: bounds.startY + bounds.height / 2,
    };
  }
  const width = canvas.getWidth();
  const height = canvas.getHeight();
  return { left: 0, top: 0, right: width, bottom: height, centerX: width / 2, centerY: height / 2 };
};

const refreshSelection = (canvas: fabric.Canvas) => {
  const active = canvas.getActiveObject();
  if (active instanceof fabric.ActiveSelection) {
    active.setCoords();
    active.dirty = true;
  }
  canvas.requestRenderAll();
};

export const alignObjectToLabel = (obj: fabric.FabricObject, align: ObjectAlign) => {
  const canvas = obj.canvas;
  if (!canvas) {
    return;
  }
  const { dx, dy } = deltaForAlign(align, visualBox(obj), labelBoundsAsBox(canvas));
  if (dx !== 0 || dy !== 0) {
    translateOnCanvas(obj, dx, dy);
  }
  refreshSelection(canvas);
};

export const alignObjectsToEachOther = (objects: fabric.FabricObject[], align: ObjectAlign) => {
  const canvas = objects[0]?.canvas;
  if (!canvas || objects.length < 2) {
    return;
  }

  const bounds = boundingBox(objects);
  objects.forEach((obj, index) => {
    const { dx, dy } = deltaForAlign(align, bounds.rects[index], bounds);
    if (dx === 0 && dy === 0) {
      return;
    }
    translateOnCanvas(obj, dx, dy);
  });

  refreshSelection(canvas);
};

export const alignObjects = (objects: fabric.FabricObject[], align: ObjectAlign) => {
  if (objects.length >= 2) {
    alignObjectsToEachOther(objects, align);
    return;
  }
  if (objects[0]) {
    alignObjectToLabel(objects[0], align);
  }
};
