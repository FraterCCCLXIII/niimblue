import * as fabric from "fabric";

export type ObjectAlign = "left" | "center" | "right" | "top" | "middle" | "bottom";

const boundingBox = (objects: fabric.FabricObject[]) => {
  const rects = objects.map((obj) => obj.getBoundingRect());
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));
  return { rects, left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
};

const deltaForAlign = (
  align: ObjectAlign,
  rect: { left: number; top: number; width: number; height: number },
  bounds: ReturnType<typeof boundingBox>,
): { dx: number; dy: number } => {
  if (align === "left") {
    return { dx: bounds.left - rect.left, dy: 0 };
  }
  if (align === "center") {
    return { dx: bounds.centerX - (rect.left + rect.width / 2), dy: 0 };
  }
  if (align === "right") {
    return { dx: bounds.right - (rect.left + rect.width), dy: 0 };
  }
  if (align === "top") {
    return { dx: 0, dy: bounds.top - rect.top };
  }
  if (align === "middle") {
    return { dx: 0, dy: bounds.centerY - (rect.top + rect.height / 2) };
  }
  return { dx: 0, dy: bounds.bottom - (rect.top + rect.height) };
};

export const alignObjectsToEachOther = (objects: fabric.FabricObject[], align: ObjectAlign) => {
  const canvas = objects[0]?.canvas;
  if (!canvas || objects.length < 2) {
    return;
  }

  const active = canvas.getActiveObject();
  const restoreSelection = active instanceof fabric.ActiveSelection;
  if (restoreSelection) {
    canvas.discardActiveObject();
  }

  const bounds = boundingBox(objects);
  objects.forEach((obj, index) => {
    const { dx, dy } = deltaForAlign(align, bounds.rects[index], bounds);
    if (dx === 0 && dy === 0) {
      return;
    }
    obj.set({
      left: (obj.left ?? 0) + dx,
      top: (obj.top ?? 0) + dy,
    });
    obj.setCoords();
  });

  if (restoreSelection) {
    canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
  }
  canvas.requestRenderAll();
};
