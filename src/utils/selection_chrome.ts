import * as fabric from "fabric";

/** Selection chrome sizes in CSS pixels, independent of canvas zoom. */
export const SELECTION_CHROME_SCREEN = {
  cornerSize: 8,
  touchCornerSize: 22,
  borderScaleFactor: 1,
  padding: 2,
  rotateOffset: 22,
} as const;

export const SELECTION_CHROME_STYLE = {
  borderColor: "#4C9AFF",
  cornerColor: "#ffffff",
  cornerStrokeColor: "#4C9AFF",
  cornerStyle: "circle" as const,
  transparentCorners: false,
  borderOpacityWhenMoving: 0.55,
  borderDashArray: null as number[] | null,
};

export type SelectionChrome = {
  cornerSize: number;
  touchCornerSize: number;
  borderScaleFactor: number;
  padding: number;
  rotateOffset: number;
};

export function selectionChromeForZoom(zoom: number): SelectionChrome {
  const safeZoom = Math.max(zoom, 0.01);
  return {
    cornerSize: SELECTION_CHROME_SCREEN.cornerSize / safeZoom,
    touchCornerSize: SELECTION_CHROME_SCREEN.touchCornerSize / safeZoom,
    borderScaleFactor: SELECTION_CHROME_SCREEN.borderScaleFactor / safeZoom,
    padding: SELECTION_CHROME_SCREEN.padding / safeZoom,
    rotateOffset: SELECTION_CHROME_SCREEN.rotateOffset / safeZoom,
  };
}

export function applySelectionChromeDefaults(chrome: SelectionChrome) {
  Object.assign(fabric.InteractiveFabricObject.ownDefaults, SELECTION_CHROME_STYLE, {
    cornerSize: chrome.cornerSize,
    touchCornerSize: chrome.touchCornerSize,
    borderScaleFactor: chrome.borderScaleFactor,
    padding: chrome.padding,
  });
}

export function applySelectionChromeToObject(obj: fabric.FabricObject, chrome: SelectionChrome) {
  obj.set({
    ...SELECTION_CHROME_STYLE,
    cornerSize: chrome.cornerSize,
    touchCornerSize: chrome.touchCornerSize,
    borderScaleFactor: chrome.borderScaleFactor,
    padding: chrome.padding,
  });

  const rotate = obj.controls?.mtr;
  if (rotate) {
    rotate.offsetY = -chrome.rotateOffset;
  }
}
