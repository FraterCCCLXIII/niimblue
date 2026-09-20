import type { PrintDirection } from "@mmote/niimbluelib";
import { DEFAULT_DPMM } from "$/utils/label_geometry";

/** Scale a design raster (DEFAULT_DPMM) to the connected printer's native DPI. */
export function printerScale(printerDpi?: number, designDpmm = DEFAULT_DPMM): number {
  if (!printerDpi || !Number.isFinite(printerDpi) || printerDpi <= 0) {
    return 1;
  }
  const scale = printerDpi / 25.4 / designDpmm;
  // 203dpi is 8 dpmm; avoid a 0.999 multiplier that snaps the head axis down.
  if (Math.abs(scale - 1) < 0.02) {
    return 1;
  }
  return scale;
}

export function snapPrintSize(
  width: number,
  height: number,
  direction: PrintDirection,
): { width: number; height: number } {
  if (direction === "left") {
    return { width, height: Math.max(8, height - (height % 8)) };
  }
  return { width: Math.max(8, width - (width % 8)), height };
}

/** Copy `source` into a print-sized canvas, padding with white if the head axis needs snapping. */
export function fitPrintCanvas(
  source: HTMLCanvasElement,
  direction: PrintDirection,
): HTMLCanvasElement {
  const snapped = snapPrintSize(source.width, source.height, direction);
  if (snapped.width === source.width && snapped.height === source.height) {
    return source;
  }

  const out = document.createElement("canvas");
  out.width = snapped.width;
  out.height = snapped.height;
  const ctx = out.getContext("2d");
  if (!ctx) {
    return source;
  }
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}
