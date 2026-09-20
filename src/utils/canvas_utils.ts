import * as fabric from "fabric";
import ArUcoMarker from "$/fabric-object/aruco";
import Barcode from "$/fabric-object/barcode";
import QRCode from "$/fabric-object/qrcode";
import { TextboxExt } from "$/fabric-object/textbox-ext";
import { OBJECT_DEFAULTS_TEXT } from "$/defaults";
import { CustomCanvas } from "$/fabric-object/custom_canvas";

export class CanvasUtils {
  static equalSpacingFillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, printWidth: number) {
    // calculate every character width, and spacing
    const widths = [];
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      const metrics = ctx.measureText(char);
      widths.push(metrics.width);
    }
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    const spacing = (printWidth - totalWidth) / (text.length - 1);

    // print every character with calculated spacing
    let offset = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      ctx.fillText(char, x + offset, y);
      offset += widths[i] + spacing;
    }
  }

  static fixFabricObjectScale(obj: fabric.FabricObject) {
    const isNotScalable = obj instanceof Barcode || obj instanceof fabric.Rect || obj instanceof QRCode || obj instanceof ArUcoMarker;

    if (isNotScalable) {
      obj.set({
        width: Math.round(obj.width * (obj.scaleX ?? 1)),
        height: Math.round(obj.height * (obj.scaleY ?? 1)),
        scaleX: 1,
        scaleY: 1,
        left: Math.round(obj.left),
        top: Math.round(obj.top),
      });

      if (obj instanceof QRCode || obj instanceof ArUcoMarker) {
        const qrMin = 42;
        const size = Math.max(obj.width + (obj.width % 2), qrMin);
        obj.set({
          width: size,
          height: size,
        });
      }
      return;
    }
  }

  /** Preserve the look of older labels that scaled text instead of fontSize. */
  static bakeTextObjectScale(obj: fabric.FabricObject) {
    if (!(obj instanceof fabric.FabricText)) {
      return;
    }

    const scaleX = obj.scaleX ?? 1;
    const scaleY = obj.scaleY ?? 1;
    if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) {
      return;
    }

    const visualHeight = obj.height * scaleY;
    obj.set({
      fontSize: Math.max(1, obj.fontSize * scaleY),
      width: Math.max(obj.width * scaleX, 1),
      scaleX: 1,
      scaleY: 1,
    });
    if (obj instanceof TextboxExt) {
      obj.minHeight = Math.max((obj.minHeight ?? 0) * scaleY, visualHeight);
      obj.initDimensions();
    }
  }

  static fitObjectIntoCanvas(canvas: fabric.Canvas, obj: fabric.FabricObject, xMargin: number, yMarin: number) {
    const size = canvas instanceof CustomCanvas ? canvas.getLabelSize() : { width: canvas.width, height: canvas.height };
    const widthRatio = size.width / (obj.width + xMargin * 2);
    const heightRatio = size.height / (obj.height + yMarin * 2);
    const scaleFactor = Math.min(widthRatio, heightRatio);
    obj.set({ left: xMargin, top: yMarin });
    obj.scale(scaleFactor);
    canvas.centerObjectV(obj);
    canvas.centerObjectH(obj);
  }

  static renderError(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.translate(-width / 2, -height / 2);
    ctx.translate(-0.5, -0.5);
    ctx.fillRect(0, 0, width + 1, height + 1);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = `16px ${OBJECT_DEFAULTS_TEXT.fontFamily}`;
    ctx.fillText("ERR", 0, 0);
    ctx.restore();
  }
}
