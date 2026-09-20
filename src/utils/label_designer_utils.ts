import * as fabric from "fabric";
import { GRID_SIZE, OBJECT_DEFAULTS } from "$/defaults";
import type { MoveDirection } from "$/types";
import { CanvasUtils } from "$/utils/canvas_utils";

export const DESIGNER_CLIPBOARD_MIME = "application/x-pressmark-objects";

type DesignerClipboardPayload = {
  v: 1;
  objects: Record<string, unknown>[];
};

export class LabelDesignerUtils {
  private static clipboardSignature = "";
  private static lastClipboardObjects: Record<string, unknown>[] | undefined;

  static async cloneSelection(canvas: fabric.Canvas): Promise<void> {
    const clonedList: fabric.FabricObject[] = [];

    const selection = canvas.getActiveObject();

    if (selection === undefined) {
      return;
    }

    const selected: fabric.FabricObject[] = canvas.getActiveObjects();

    for (const obj of selected) {
      const cloned = await obj.clone();

      if (selection instanceof fabric.ActiveSelection) {
        cloned.left += selection.left + selection.width / 2;
        cloned.top += selection.top + selection.height / 2;
      }

      cloned.top += GRID_SIZE;
      cloned.left += GRID_SIZE;
      cloned.snapAngle = OBJECT_DEFAULTS.snapAngle;

      clonedList.push(cloned);
    }

    canvas.add(...clonedList);
    this.selectObjects(canvas, clonedList);
  }

  static moveSelection(
    canvas: fabric.Canvas,
    direction: MoveDirection,
    ctrl?: boolean,
  ) {
    const selected: fabric.FabricObject[] = canvas.getActiveObjects();
    const amount = ctrl ? 1 : GRID_SIZE;

    selected.forEach((obj) => {
      if (direction === "left") {
        // round to fix inter-pixel positions
        obj.left = Math.round(obj.left) - amount;
      } else if (direction === "right") {
        obj.left = Math.round(obj.left) + amount;
      } else if (direction === "up") {
        obj.top = Math.round(obj.top) - amount;
      } else if (direction === "down") {
        obj.top = Math.round(obj.top) + amount;
      }
      obj.setCoords();
    });
    canvas.requestRenderAll();
  }

  static deleteSelection(canvas: fabric.Canvas) {
    const selected: fabric.FabricObject[] = canvas.getActiveObjects();
    selected.forEach((obj) => {
      canvas.remove(obj);
    });
  }

  static selectObjects(canvas: fabric.Canvas, objects: fabric.FabricObject[]) {
    if (objects.length === 0) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }
    if (objects.length === 1) {
      canvas.setActiveObject(objects[0]);
    } else {
      canvas.setActiveObject(new fabric.ActiveSelection(objects, { canvas }));
    }
    canvas.requestRenderAll();
  }

  static serializeSelection(canvas: fabric.Canvas): Record<string, unknown>[] | undefined {
    const selected = canvas.getActiveObjects();
    if (selected.length === 0) {
      return;
    }

    canvas.discardActiveObject();
    try {
      return selected.map((obj) => {
        const json = obj.toObject() as Record<string, unknown> & { left: number; top: number; csvSource?: string };
        if (typeof json.csvSource === "string") {
          json.text = json.csvSource;
        }
        const pos = obj.getXY();
        json.left = pos.x;
        json.top = pos.y;
        return json;
      });
    } finally {
      this.selectObjects(canvas, selected);
    }
  }

  static encodeClipboard(objects: Record<string, unknown>[]): string {
    const payload: DesignerClipboardPayload = { v: 1, objects };
    return JSON.stringify(payload);
  }

  static decodeClipboard(data: string | undefined | null): Record<string, unknown>[] | undefined {
    if (!data) {
      return;
    }
    try {
      const parsed = JSON.parse(data) as Partial<DesignerClipboardPayload>;
      if (parsed?.v === 1 && Array.isArray(parsed.objects) && parsed.objects.length > 0) {
        return parsed.objects;
      }
    } catch {
      return;
    }
  }

  static rememberClipboard(objects: Record<string, unknown>[]) {
    this.clipboardSignature = JSON.stringify(objects);
    this.lastClipboardObjects = objects;
  }

  static writeClipboardPayload(objects: Record<string, unknown>[], data?: DataTransfer | null) {
    const payload = this.encodeClipboard(objects);
    this.rememberClipboard(objects);
    if (data) {
      try {
        data.setData(DESIGNER_CLIPBOARD_MIME, payload);
      } catch {
        // Some browsers only allow a short list of MIME types.
      }
      data.setData("text/plain", payload);
      return;
    }
    void navigator.clipboard?.writeText(payload);
  }

  static peekClipboardObjects(): Record<string, unknown>[] | undefined {
    return this.lastClipboardObjects;
  }

  static readClipboardObjects(data: DataTransfer | null): Record<string, unknown>[] | undefined {
    const fromEvent =
      this.decodeClipboard(data?.getData(DESIGNER_CLIPBOARD_MIME)) ?? this.decodeClipboard(data?.getData("text/plain"));
    if (fromEvent) {
      return fromEvent;
    }

    const hasImage = data ? [...data.items].some((item) => item.type.startsWith("image/")) : false;
    if (hasImage) {
      return;
    }

    // Keydown copy writes the system clipboard asynchronously, and clicking a
    // page chip leaves leftover text in the paste event. Keep the last in-app copy.
    return this.lastClipboardObjects;
  }

  static async pasteObjects(
    canvas: fabric.Canvas,
    serialized: Record<string, unknown>[],
  ): Promise<fabric.FabricObject[] | undefined> {
    const objects = await fabric.util.enlivenObjects<fabric.FabricObject>(serialized);
    if (objects.length === 0) {
      return;
    }

    const signature = JSON.stringify(serialized);
    if (signature !== this.clipboardSignature) {
      this.clipboardSignature = signature;
    }

    const positions = serialized.map((item) => ({
      x: typeof item.left === "number" ? item.left : 0,
      y: typeof item.top === "number" ? item.top : 0,
    }));

    for (const [index, obj] of objects.entries()) {
      obj.set({
        snapAngle: OBJECT_DEFAULTS.snapAngle,
        left: positions[index]?.x ?? obj.left,
        top: positions[index]?.y ?? obj.top,
      });
      CanvasUtils.bakeTextObjectScale(obj);
      CanvasUtils.fixFabricObjectScale(obj);
      obj.setCoords();
    }

    canvas.add(...objects);
    this.selectObjects(canvas, objects);
    for (const [index, obj] of objects.entries()) {
      const pos = positions[index];
      if (pos) {
        obj.setXY(new fabric.Point(pos.x, pos.y));
        obj.setCoords();
      }
    }
    canvas.requestRenderAll();
    return objects;
  }

  static isAnyInputFocused(canvas: fabric.Canvas): boolean {
    const focused: Element | null = document.activeElement;

    if (
      focused instanceof HTMLElement &&
      (focused.tagName === "INPUT" ||
        focused.tagName === "TEXTAREA" ||
        focused.tagName === "SELECT" ||
        focused.isContentEditable)
    ) {
      return true;
    }
    const selected: fabric.FabricObject[] = canvas.getActiveObjects();
    const editing = selected.some(
      (obj) => obj instanceof fabric.IText && obj.isEditing,
    );

    if (editing) {
      return true;
    }

    return false;
  }
}
