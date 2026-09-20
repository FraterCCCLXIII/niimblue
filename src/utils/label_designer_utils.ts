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
  private static pasteGeneration = 0;
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

    const newSelection = new fabric.ActiveSelection(clonedList);
    canvas.setActiveObject(newSelection);
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

  static serializeSelection(canvas: fabric.Canvas): Record<string, unknown>[] | undefined {
    const selected = canvas.getActiveObjects();
    if (selected.length === 0) {
      return;
    }

    return selected.map((obj) => {
      const json = obj.toObject() as Record<string, unknown> & { left: number; top: number };
      const originX = (typeof json.originX === "string" ? json.originX : obj.originX) as fabric.TOriginX;
      const originY = (typeof json.originY === "string" ? json.originY : obj.originY) as fabric.TOriginY;
      const pos = obj.getPointByOrigin(originX, originY);
      json.left = pos.x;
      json.top = pos.y;
      return json;
    });
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
    this.pasteGeneration = 0;
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

  static readClipboardObjects(data: DataTransfer | null): Record<string, unknown>[] | undefined {
    const fromEvent =
      this.decodeClipboard(data?.getData(DESIGNER_CLIPBOARD_MIME)) ?? this.decodeClipboard(data?.getData("text/plain"));
    if (fromEvent) {
      return fromEvent;
    }

    const hasImage = data ? [...data.items].some((item) => item.type.startsWith("image/")) : false;
    const text = data?.getData("text/plain");
    if (hasImage || text) {
      return;
    }

    // Navigator clipboard writes are async; keep the last copied objects when the event payload is empty.
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
      this.pasteGeneration = 0;
    }
    this.pasteGeneration += 1;
    const offset = this.pasteGeneration * GRID_SIZE;

    for (const obj of objects) {
      obj.set({
        snapAngle: OBJECT_DEFAULTS.snapAngle,
        left: obj.left + offset,
        top: obj.top + offset,
      });
      CanvasUtils.bakeTextObjectScale(obj);
      CanvasUtils.fixFabricObjectScale(obj);
      obj.setCoords();
    }

    canvas.add(...objects);
    canvas.setActiveObject(new fabric.ActiveSelection(objects));
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
