import * as fabric from "fabric";
import { DEFAULT_LABEL_PROPS, GRID_SIZE } from "$/defaults";
import type { LabelProps } from "$/types";
import {
  applySelectionChromeDefaults,
  applySelectionChromeToObject,
  selectionChromeForZoom,
} from "$/utils/selection_chrome";

type LabelBounds = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
};
type FoldSegment = { start: number; end: number };
type FoldInfo = {
  axis: "vertical" | "horizontal" | "none";
  points: number[];
  segments: FoldSegment[];
};
type MirrorInfo = { pos: fabric.Point; flip: boolean };

/** Screen-space gutter around the label so selection handles are not clipped. */
export const ARTBOARD_CHROME_PAD = 24;

export class CustomCanvas extends fabric.Canvas {
  private labelProps: LabelProps = DEFAULT_LABEL_PROPS;
  private labelWidth = 1;
  private labelHeight = 1;
  private artboardChrome = false;
  private refreshingArtboard = false;
  private readonly SEPARATOR_LINE_WIDTH = 2;
  private readonly ROUND_RADIUS = 10;
  private readonly TAIL_WIDTH = 40;
  private readonly GRAY = "#CFCFCF";
  private readonly MIRROR_GHOST_COLOR = "rgba(0, 0, 0, 0.3)";
  private customBackground: boolean = true;
  private highlightMirror: boolean = true;
  private gridEnabled: boolean = false;
  private virtualZoomRatio: number = 1;
  onZoomChange?: (zoom: number) => void;
  onPan?: (dx: number, dy: number) => void;

  constructor(
    el?: string | HTMLCanvasElement,
    options?: fabric.TOptions<fabric.CanvasOptions>,
  ) {
    super(el, { allowTouchScrolling: true, backgroundVpt: true, ...options });
    this.labelWidth = this.width || 1;
    this.labelHeight = this.height || 1;
    this.artboardChrome = !!el && options?.enableRetinaScaling !== false;
    this.backgroundVpt = true;
    const wrapper = this.getElement()?.parentElement;
    if (wrapper) {
      wrapper.style.overflow = "visible";
    }
    this.setupZoomAndPan();
    this.preserveObjectStacking = true;
    this.selectionColor = "rgba(76, 154, 255, 0.08)";
    this.selectionBorderColor = "#4C9AFF";
    this.applySelectionChrome();
    this.on("object:added", (e) => {
      if (e.target) {
        applySelectionChromeToObject(e.target, selectionChromeForZoom(this.virtualZoomRatio));
      }
    });
    if (this.artboardChrome) {
      this.refreshArtboard();
    }
  }

  private setupZoomAndPan() {
    const container = this.getElement().parentElement;
    if (!container) return;

    let initialPinchDistance = 0;
    let initialZoom = 1;
    let lastMidPoint = { x: 0, y: 0 };

    container.addEventListener(
        "touchstart",
        (e: TouchEvent) => {
          if (e.touches.length === 2) {
            this.selection = false;
            this.discardActiveObject();

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            initialPinchDistance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY,
            );
            initialZoom = this.getVirtualZoom();

            lastMidPoint = {
              x: (touch1.clientX + touch2.clientX) / 2,
              y: (touch1.clientY + touch2.clientY) / 2,
            };
          } else if (e.touches.length === 1) {

          }
        },
        { passive: false },
    );

    container.addEventListener(
        "touchmove",
        (e: TouchEvent) => {
          if (e.touches.length === 2) {
            e.preventDefault();

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            // Zoom
            const currentPinchDistance = Math.hypot(
                touch1.clientX - touch2.clientX,
                touch1.clientY - touch2.clientY,
            );

            if (initialPinchDistance > 0) {
              const newZoom = currentPinchDistance / initialPinchDistance * initialZoom;
              if (Math.abs(newZoom - this.virtualZoomRatio) > 0.02) {
                if (isFinite(newZoom) && newZoom > 0) {
                  this.virtualZoom(newZoom);
                }
              }
            }

            // Pan
            const currentMidPoint = {
              x: (touch1.clientX + touch2.clientX) / 2,
              y: (touch1.clientY + touch2.clientY) / 2,
            };

            const dx = currentMidPoint.x - lastMidPoint.x;
            const dy = currentMidPoint.y - lastMidPoint.y;

            this.onPan?.(dx, dy);
            lastMidPoint = currentMidPoint;
          }
        },
        { passive: false },
    );

    const stopTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // If not adding this delay, it could happen that objects are selected after zooming/panning
        setTimeout(() => {
          this.selection = true;
        }, 10);
      }
    };
    container.addEventListener("touchend", stopTouch);
    container.addEventListener("touchcancel", stopTouch);
  }

  /**
   * Keep the drawing buffer at devicePixelRatio × view zoom so CSS zoom does
   * not stretch label pixels. Print canvases use enableRetinaScaling=false.
   */
  override getRetinaScaling(): number {
    return super.getRetinaScaling() * (this.virtualZoomRatio ?? 1);
  }

  public virtualZoom(newZoom: number) {
    this.virtualZoomRatio = Math.min(Math.max(0.25, newZoom), 4);
    this.refreshArtboard();
    this.forEachObject((obj) => {
      obj.set("dirty", true);
    });
    if (this.onZoomChange) {
      this.onZoomChange(this.virtualZoomRatio);
    }
  }

  private artboardInset(): number {
    if (!this.artboardChrome) {
      return 0;
    }
    return ARTBOARD_CHROME_PAD / Math.max(this.virtualZoomRatio, 0.01);
  }

  public getLabelSize(): { width: number; height: number } {
    return { width: this.labelWidth, height: this.labelHeight };
  }

  public setLabelSize(width: number, height: number) {
    this.labelWidth = Math.max(1, width);
    this.labelHeight = Math.max(1, height);
    this.refreshArtboard();
  }

  override setDimensions(size: { width?: number | string; height?: number | string }, options?: { cssOnly?: boolean; backstoreOnly?: boolean }) {
    if (this.artboardChrome && !this.refreshingArtboard && !options?.cssOnly && !options?.backstoreOnly) {
      const width = typeof size.width === "number" ? size.width : this.labelWidth;
      const height = typeof size.height === "number" ? size.height : this.labelHeight;
      this.setLabelSize(width, height);
      return;
    }
    super.setDimensions(size as never, options as never);
  }

  override async loadFromJSON(...args: Parameters<fabric.Canvas["loadFromJSON"]>) {
    const [json, ...rest] = args;
    const parsed = typeof json === "string" ? (JSON.parse(json) as Record<string, unknown>) : json;
    if (parsed && typeof parsed === "object") {
      const { width: _width, height: _height, viewportTransform: _vpt, ...objectsOnly } = parsed as Record<string, unknown>;
      const result = await super.loadFromJSON(objectsOnly as typeof json, ...rest);
      this.refreshArtboard();
      return result;
    }
    const result = await super.loadFromJSON(...args);
    this.refreshArtboard();
    return result;
  }

  override getCenterPoint(): fabric.Point {
    const bounds = this.getLabelBounds();
    return new fabric.Point(bounds.startX + bounds.width / 2, bounds.startY + bounds.height / 2);
  }

  private refreshArtboard() {
    if (this.refreshingArtboard) {
      return;
    }
    this.refreshingArtboard = true;
    const inset = this.artboardInset();
    const width = this.labelWidth + inset * 2;
    const height = this.labelHeight + inset * 2;
    this.setViewportTransform([1, 0, 0, 1, inset, inset]);
    super.setDimensions({ width, height }, { backstoreOnly: true });
    if (this.getElement()) {
      super.setDimensions(
        {
          width: `${width * this.virtualZoomRatio}px`,
          height: `${height * this.virtualZoomRatio}px`,
        },
        { cssOnly: true },
      );
    }
    this.refreshingArtboard = false;
    this.applySelectionChrome();
  }

  private applySelectionChrome() {
    const chrome = selectionChromeForZoom(this.virtualZoomRatio);
    applySelectionChromeDefaults(chrome);
    this.forEachObject((obj) => applySelectionChromeToObject(obj, chrome));
    const active = this.getActiveObject();
    if (active) {
      applySelectionChromeToObject(active, chrome);
    }
    this.selectionLineWidth = chrome.borderScaleFactor;
    this.requestRenderAll();
  }

  public virtualZoomIn() {
    this.virtualZoom(this.virtualZoomRatio * 1.05);
  }

  public virtualZoomOut() {
    this.virtualZoom(this.virtualZoomRatio * 0.95);
  }

  public getVirtualZoom(): number {
    return this.virtualZoomRatio;
  }

  public resetVirtualZoom() {
    this.virtualZoom(1);
  }

  setLabelProps(value: LabelProps) {
    this.labelProps = value;
    this.requestRenderAll();
  }

  setCustomBackground(value: boolean) {
    this.customBackground = value;
  }

  setHighlightMirror(value: boolean) {
    this.highlightMirror = value;
  }

  setGridEnabled(value: boolean) {
    this.gridEnabled = value;
    this.requestRenderAll();
  }

  /** Get label bounds without tail */
  getLabelBounds(): LabelBounds {
    let endX = this.labelWidth || this.width || 1;
    let endY = this.labelHeight || this.height || 1;
    let startX = 0;
    let startY = 0;

    if (this.labelProps.tailPos === "right") {
      endX -= this.labelProps.tailLength ?? 0;
    } else if (this.labelProps.tailPos === "bottom") {
      endY -= this.labelProps.tailLength ?? 0;
    } else if (this.labelProps.tailPos === "left") {
      startX += this.labelProps.tailLength ?? 0;
    } else if (this.labelProps.tailPos === "top") {
      startY += this.labelProps.tailLength ?? 0;
    }

    const width = endX - startX;
    const height = endY - startY;

    return { startX, startY, endX, endY, width, height };
  }

  /** Get fold line position for splitted labels */
  getFoldInfo(): FoldInfo {
    const bb = this.getLabelBounds();
    const points: number[] = [];
    const segments: FoldSegment[] = [];
    const splitParts = this.labelProps.splitParts ?? 2;

    if (splitParts < 2) {
      return { axis: "none", points, segments };
    }

    if (this.labelProps.split === "horizontal") {
      const segmentHeight = bb.height / splitParts;
      let lastY: number = bb.startY;

      for (let i = 1; i < splitParts; i++) {
        const y =
          bb.startY + segmentHeight * i - this.SEPARATOR_LINE_WIDTH / 2 + 1;
        points.push(y);
        segments.push({ start: lastY, end: y });
        lastY = y;
      }

      segments.push({ start: lastY, end: bb.endY });

      return { axis: "horizontal", points, segments };
    } else if (this.labelProps.split === "vertical") {
      const segmentWidth = bb.width / splitParts;
      let lastX: number = bb.startX;

      for (let i = 1; i < splitParts; i++) {
        const x =
          bb.startX + segmentWidth * i - this.SEPARATOR_LINE_WIDTH / 2 + 1;
        points.push(x);
        segments.push({ start: lastX, end: x });
        lastX = x;
      }

      segments.push({ start: lastX, end: bb.endX });

      return { axis: "vertical", points, segments };
    }

    return { axis: "none", points, segments };
  }

  override _renderBackground(ctx: CanvasRenderingContext2D) {
    if (this.width === undefined || this.height === undefined) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "white";

    // Draw simple white background and exit
    if (!this.customBackground) {
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      return;
    }

    // Fabric applies viewportTransform only to objects. Keep the label
    // paper in that same space so chrome padding does not shift contents.
    if (this.artboardChrome && this.backgroundVpt) {
      ctx.transform(...this.viewportTransform);
    }

    // Disable further actions for circle labels, just render
    const bb = this.getLabelBounds();

    if (this.labelProps.shape === "circle") {
      ctx.beginPath();
      ctx.arc(bb.startX + bb.width / 2, bb.startY + bb.height / 2, bb.height / 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
      return;
    }

    let roundRadius = this.ROUND_RADIUS;
    const fold = this.getFoldInfo();

    if (this.labelProps.shape !== "rounded_rect") {
      roundRadius = 0;
    }

    // Draw tail
    ctx.fillStyle = this.GRAY;

    ctx.beginPath();
    if (
      this.labelProps.tailLength !== undefined &&
      this.labelProps.tailLength > 0
    ) {
      if (this.labelProps.tailPos === "right") {
        ctx.rect(
          bb.endX - roundRadius,
          bb.endY / 2 - this.TAIL_WIDTH / 2,
          this.labelWidth - bb.endX + roundRadius,
          this.TAIL_WIDTH,
        );
      } else if (this.labelProps.tailPos === "bottom") {
        ctx.rect(
          bb.endX / 2 - this.TAIL_WIDTH / 2,
          bb.endY - roundRadius,
          this.TAIL_WIDTH,
          this.labelHeight - bb.endY + roundRadius,
        );
      } else if (this.labelProps.tailPos === "left") {
        ctx.rect(
          0,
          bb.endY / 2 - this.TAIL_WIDTH / 2,
          bb.startX + roundRadius,
          this.TAIL_WIDTH,
        );
      } else if (this.labelProps.tailPos === "top") {
        ctx.rect(
          bb.endX / 2 - this.TAIL_WIDTH / 2,
          0,
          this.TAIL_WIDTH,
          bb.startY + roundRadius,
        );
      }
    }
    ctx.fill();

    // Draw label(s)
    ctx.fillStyle = "white";

    ctx.beginPath();

    const splitParts = this.labelProps.splitParts ?? 2;

    if (this.labelProps.shape === "rounded_rect") {
      if (this.labelProps.split === "horizontal") {
        const segmentHeight = bb.height / splitParts;
        ctx.roundRect(
          bb.startX,
          bb.startY,
          bb.width,
          segmentHeight,
          roundRadius,
        ); // First part
        fold.points.forEach((y) =>
          ctx.roundRect(bb.startX, y, bb.width, segmentHeight, roundRadius),
        ); // Other parts
      } else if (this.labelProps.split === "vertical") {
        const segmentWidth = bb.width / splitParts;
        ctx.roundRect(
          bb.startX,
          bb.startY,
          segmentWidth,
          bb.height,
          roundRadius,
        ); // First part
        fold.points.forEach((x) =>
          ctx.roundRect(x, bb.startY, segmentWidth, bb.height, roundRadius),
        ); // Other parts
      } else {
        ctx.roundRect(bb.startX, bb.startY, bb.width, bb.height, roundRadius);
      }
    } else {
      ctx.rect(bb.startX, bb.startY, bb.width, bb.height);
    }

    ctx.fill();

    // Draw separator

    ctx.strokeStyle = this.GRAY;
    ctx.lineWidth = this.SEPARATOR_LINE_WIDTH;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();

    if (fold.axis === "horizontal") {
      fold.points.forEach((x) => {
        ctx.moveTo(bb.startX + roundRadius, x);
        ctx.lineTo(bb.endX - roundRadius, x);
      });
    } else if (fold.axis === "vertical") {
      fold.points.forEach((y) => {
        ctx.moveTo(y, bb.startY + roundRadius);
        ctx.lineTo(y, bb.endY - roundRadius);
      });
    }

    ctx.stroke();

    // Draw grid
    if (this.gridEnabled) {
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(100, 100, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      const step = GRID_SIZE * 5;
      for (let x = bb.startX + step; x < bb.endX; x += step) {
        ctx.moveTo(x, bb.startY);
        ctx.lineTo(x, bb.endY);
      }
      for (let y = bb.startY + step; y < bb.endY; y += step) {
        ctx.moveTo(bb.startX, y);
        ctx.lineTo(bb.endX, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
  override _renderObjects(
    ctx: CanvasRenderingContext2D,
    objects: fabric.FabricObject[],
  ) {
    super._renderObjects(ctx, objects);

    if (!this.highlightMirror || this.getActiveObjects().length > 1) {
      return;
    }

    ctx.save();

    objects.forEach((obj) => {
      const infos = this.getMirroredObjectCoords(obj);
      infos.forEach((info) => {
        const bbox = obj.getBoundingRect();
        ctx.fillStyle = this.MIRROR_GHOST_COLOR;
        ctx.fillRect(
          info.pos.x - bbox.width / 2,
          info.pos.y - bbox.height / 2,
          bbox.width,
          bbox.height,
        );
        ctx.restore();
      });
    });
    ctx.restore();
  }

  /**
   * Return new object positions (origin is center) if object needs mirroring
   **/
  getMirroredObjectCoords(obj: fabric.FabricObject): MirrorInfo[] {
    const fold = this.getFoldInfo();
    const result: MirrorInfo[] = [];

    if (
      fold.axis === "none" ||
      !(this.labelProps.mirror === "flip" || this.labelProps.mirror === "copy")
    ) {
      return result;
    }

    const bounds = this.getLabelBounds();

    if (fold.axis === "vertical") {
      if (this.labelProps.mirror === "copy") {
        fold.points.forEach((x) => {
          const pos = obj.getPointByOrigin("center", "center");
          pos.setX(x + (pos.x - bounds.startX));
          result.push({ pos, flip: false });
        });
      } else if (
        this.labelProps.mirror === "flip" &&
        fold.points.length === 1
      ) {
        // Half split only supported
        const axisX = fold.points[0];
        const pos = obj.getPointByOrigin("center", "center");
        pos.setX(axisX + (axisX - pos.x));
        pos.setY(bounds.startY + bounds.endY - pos.y);
        result.push({ pos, flip: true });
      }
    } else if (fold.axis === "horizontal") {
      if (this.labelProps.mirror === "copy") {
        fold.points.forEach((y) => {
          const pos = obj.getPointByOrigin("center", "center");
          pos.setY(y + (pos.y - bounds.startY));
          result.push({ pos, flip: false });
        });
      } else if (
        this.labelProps.mirror === "flip" &&
        fold.points.length === 1
      ) {
        // Half split only supported
        const axisY = fold.points[0];
        const pos = obj.getPointByOrigin("center", "center");
        pos.setY(axisY + (axisY - pos.y));
        pos.setX(bounds.startX + bounds.endX - pos.x);
        result.push({ pos, flip: true });
      }
    }

    return result;
  }

  /** Clone mirrored objects and add them to canvas */
  async createMirroredObjects() {
    const objects = this.getObjects();
    for (const obj of objects) {
      const infos = this.getMirroredObjectCoords(obj);

      for (const info of infos) {
        const newObj = await obj.clone();
        newObj.setPositionByOrigin(info.pos, "center", "center");
        if (info.flip) {
          newObj.centeredRotation = true;
          newObj.rotate((newObj.angle + 180) % 360);
        }
        this.add(newObj);
      }
    }
  }

  /** Centers object horizontally in the canvas or label part */
  override centerObjectH(object: fabric.FabricObject): void {
    if ((this.labelProps.split ?? "none") !== "none") {
      const pos = object.getPointByOrigin("center", "center");
      const bounds = this.getLabelBounds();
      const fold = this.getFoldInfo();
      let centerX = bounds.startX + bounds.width / 2;

      if (fold.axis !== "horizontal") {
        fold.segments.forEach((seg) => {
          if (pos.x >= seg.start && pos.x <= seg.end) {
            centerX = seg.start + (seg.end - seg.start) / 2;
          }
        });
      }
      pos.setX(centerX);

      object.setPositionByOrigin(pos, "center", "center");
      return;
    }

    super.centerObjectH(object);
  }

  /** Centers object vertically in the canvas or label part */
  override centerObjectV(object: fabric.FabricObject): void {
    if ((this.labelProps.split ?? "none") !== "none") {
      const pos = object.getPointByOrigin("center", "center");
      const bounds = this.getLabelBounds();
      const fold = this.getFoldInfo();
      let centerY = bounds.startY + bounds.height / 2;

      if (fold.axis !== "vertical") {
        fold.segments.forEach((seg) => {
          if (pos.y >= seg.start && pos.y <= seg.end) {
            centerY = seg.start + (seg.end - seg.start) / 2;
          }
        });
      }

      pos.setY(centerY);
      object.setPositionByOrigin(pos, "center", "center");
      return;
    }

    super.centerObjectV(object);
  }
}
