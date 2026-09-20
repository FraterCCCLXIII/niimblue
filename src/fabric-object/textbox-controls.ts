import * as fabric from "fabric";
import { SELECTION_CHROME_SCREEN } from "$/utils/selection_chrome";

const {
  changeWidth,
  changeObjectWidth,
  changeObjectHeight,
  wrapWithFireEvent,
  wrapWithFixedAnchor,
  scaleCursorStyleHandler,
  scaleSkewCursorStyleHandler,
  scalingEqually,
  rotationStyleHandler,
  rotationWithSnapping,
} = fabric.controlsUtils;

function rememberFrameHeight(target: fabric.FabricObject) {
  if ("minHeight" in target) {
    Reflect.set(target, "minHeight", target.height);
  }
}

const resizeFrameHeight = wrapWithFireEvent(
  "resizing",
  wrapWithFixedAnchor((eventData, transform, x, y) => {
    const changed = changeObjectHeight(eventData, transform, x, y);
    if (changed) {
      rememberFrameHeight(transform.target);
    }
    return changed;
  }),
);

const resizeFrame = wrapWithFireEvent(
  "resizing",
  wrapWithFixedAnchor((eventData, transform, x, y) => {
    const widthChanged = changeObjectWidth(eventData, transform, x, y);
    const heightChanged = changeObjectHeight(eventData, transform, x, y);
    if (heightChanged) {
      rememberFrameHeight(transform.target);
    }
    return widthChanged || heightChanged;
  }),
);

/** Side and corner handles change the text frame, not font size. */
export function createFrameTextControls() {
  return {
    ml: new fabric.Control({
      x: -0.5,
      y: 0,
      actionHandler: changeWidth,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionName: "resizing",
    }),
    mr: new fabric.Control({
      x: 0.5,
      y: 0,
      actionHandler: changeWidth,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionName: "resizing",
    }),
    mt: new fabric.Control({
      x: 0,
      y: -0.5,
      actionHandler: resizeFrameHeight,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionName: "resizing",
    }),
    mb: new fabric.Control({
      x: 0,
      y: 0.5,
      actionHandler: resizeFrameHeight,
      cursorStyleHandler: scaleSkewCursorStyleHandler,
      actionName: "resizing",
    }),
    tl: new fabric.Control({
      x: -0.5,
      y: -0.5,
      actionHandler: resizeFrame,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionName: "resizing",
    }),
    tr: new fabric.Control({
      x: 0.5,
      y: -0.5,
      actionHandler: resizeFrame,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionName: "resizing",
    }),
    bl: new fabric.Control({
      x: -0.5,
      y: 0.5,
      actionHandler: resizeFrame,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionName: "resizing",
    }),
    br: new fabric.Control({
      x: 0.5,
      y: 0.5,
      actionHandler: scalingEqually,
      cursorStyleHandler: scaleCursorStyleHandler,
      actionName: "scaling",
    }),
    mtr: new fabric.Control({
      x: 0,
      y: -0.5,
      actionHandler: rotationWithSnapping,
      cursorStyleHandler: rotationStyleHandler,
      offsetY: -SELECTION_CHROME_SCREEN.rotateOffset,
      withConnection: true,
      actionName: "rotate",
    }),
  };
}
