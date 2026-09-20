import * as fabric from "fabric";
import QRCode from "$/fabric-object/qrcode";
import Barcode from "$/fabric-object/barcode";
import { hasVariableTemplate, resolveTemplate } from "$/utils/canvas_preprocess";
import type { FabricJson } from "$/types";

export const CSV_FABRIC_PROPS = ["csvSource"] as const;

type CsvBoundObject = fabric.FabricObject & { csvSource?: string; text?: string };

const CSV_BOUND_TYPES = new Set(["textbox", "i-text", "text", "QRCode", "Barcode"]);

export const isCsvBoundObject = (obj: fabric.FabricObject): obj is CsvBoundObject => {
  if (obj instanceof fabric.IText || obj instanceof QRCode || obj instanceof Barcode) {
    return true;
  }
  return typeof (obj as CsvBoundObject).text === "string" && CSV_BOUND_TYPES.has(String(obj.type));
};

export const getCsvSource = (obj: fabric.FabricObject): string | undefined => {
  if (!isCsvBoundObject(obj)) {
    return undefined;
  }
  return obj.csvSource;
};

export const getBoundText = (obj: fabric.FabricObject): string => {
  if (!isCsvBoundObject(obj)) {
    return "";
  }
  return obj.csvSource ?? obj.text ?? "";
};

export const setBoundText = (obj: fabric.FabricObject, value: string, variables?: { [key: string]: string }) => {
  const target = obj as CsvBoundObject;
  if (typeof target.set !== "function") {
    return;
  }
  if (hasVariableTemplate(value)) {
    target.csvSource = value;
    target.set({ text: variables ? resolveTemplate(value, variables) : value });
    return;
  }
  target.csvSource = undefined;
  target.set({ text: value });
};

export const restoreCsvSources = (canvas: fabric.Canvas) => {
  canvas.forEachObject((obj) => {
    if (!isCsvBoundObject(obj) || obj.csvSource == null) {
      return;
    }
    obj.set({ text: obj.csvSource });
  });
};

export const applyCsvPreview = (canvas: fabric.Canvas, variables?: { [key: string]: string }) => {
  canvas.forEachObject((obj) => {
    if (!isCsvBoundObject(obj)) {
      return;
    }
    const source = obj.csvSource ?? obj.text ?? "";
    if (!hasVariableTemplate(source)) {
      return;
    }
    obj.csvSource = source;
    obj.set({ text: variables ? resolveTemplate(source, variables) : source });
  });
  canvas.requestRenderAll();
};

export const cloneFabricJson = (json: FabricJson): FabricJson => JSON.parse(JSON.stringify(json)) as FabricJson;

export const serializeCanvasJson = (canvas: fabric.Canvas): FabricJson => {
  const display = new Map<fabric.FabricObject, string>();
  canvas.forEachObject((obj) => {
    if (isCsvBoundObject(obj) && obj.csvSource != null) {
      display.set(obj, obj.text ?? "");
      obj.set({ text: obj.csvSource });
    }
  });
  const json = canvas.toJSON() as FabricJson;
  canvas.forEachObject((obj) => {
    const text = display.get(obj);
    if (text != null) {
      obj.set({ text });
    }
  });
  return json;
};
