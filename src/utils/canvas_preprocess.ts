import * as fabric from "fabric";
import QRCode from "$/fabric-object/qrcode";
import Barcode from "$/fabric-object/barcode";
import dayjs from "dayjs";
import { TextboxExt } from "$/fabric-object/textbox-ext";

const VARIABLE_TEMPLATE_RX = /{\s*([^{}|]+?)\s*(?:\|\s*([^}]*?)\s*)?}/g;

const preprocessDateTime = (format?: string) => {
  const dt = dayjs();
  if (format) {
    return dt.format(format);
  }
  return dt.format("YYYY-MM-DD HH:mm:ss");
};

const lookupVariable = (key: string, variables?: { [v: string]: string }): string | undefined => {
  if (!variables) {
    return undefined;
  }
  const trimmed = key.trim();
  if (trimmed in variables) {
    return variables[trimmed];
  }
  if (key in variables) {
    return variables[key];
  }
  const match = Object.keys(variables).find((name) => name.trim() === trimmed);
  return match != null ? variables[match] : undefined;
};

export const hasVariableTemplate = (input: string): boolean => {
  VARIABLE_TEMPLATE_RX.lastIndex = 0;
  return VARIABLE_TEMPLATE_RX.test(input);
};

export const resolveTemplate = (input: string, variables?: { [v: string]: string }): string => {
  VARIABLE_TEMPLATE_RX.lastIndex = 0;
  return input.replace(VARIABLE_TEMPLATE_RX, (src, rawKey, filter) => {
    const key = String(rawKey ?? "").trim();
    const value = lookupVariable(key, variables);
    if (value !== undefined) {
      return value;
    }
    if (key === "dt") {
      return preprocessDateTime(filter);
    }
    return src;
  });
};

/** Replace text templates in some canvas objects */
export const canvasPreprocess = (canvas: fabric.Canvas, variables?: { [key: string]: string }) => {
  canvas.forEachObject((obj: fabric.FabricObject) => {
    if (obj instanceof fabric.IText) {
      const text = resolveTemplate(obj.text ?? "", variables);

      if (obj instanceof TextboxExt && obj.fontAutoSize) {
        obj.setAndShrinkText(text, obj.width);
      } else {
        obj.set({ text });
      }
    } else if (obj instanceof QRCode || obj instanceof Barcode) {
      obj.set({ text: resolveTemplate(obj.text ?? "", variables) });
    }
  });
};
