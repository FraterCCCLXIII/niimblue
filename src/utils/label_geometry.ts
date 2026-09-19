import type { LabelPreset, LabelProps, LabelShape, LabelSplit, LabelUnit, MirrorType, TailPosition } from "$/types";
import type { PrintDirection } from "@mmote/niimbluelib";

export const DEFAULT_DPMM = 8;

export interface LabelDimensionInput {
  width: number;
  height: number;
  unit: LabelUnit;
  dpmm: number;
  printDirection: PrintDirection;
  shape?: LabelShape;
  split?: LabelSplit;
  splitParts?: number;
  tailPos?: TailPosition;
  tailLength?: number;
  mirror?: MirrorType;
}

export function labelPropsFromPreset(preset: LabelPreset): LabelProps {
  return applyLabelDimensions({
    width: preset.width,
    height: preset.height,
    unit: preset.unit,
    dpmm: preset.dpmm,
    printDirection: preset.printDirection,
    shape: preset.shape,
    split: preset.split,
    splitParts: preset.splitParts,
    tailPos: preset.tailPos,
    tailLength: preset.tailLength,
    mirror: preset.mirror,
  });
}

export function applyLabelDimensions(input: LabelDimensionInput): LabelProps {
  let width = input.width;
  let height = input.height;
  let tailLength = input.tailLength ?? 0;

  if (input.unit === "mm") {
    width *= input.dpmm;
    height *= input.dpmm;
    tailLength *= input.dpmm;
  }

  width = Math.max(width, input.dpmm);
  height = Math.max(height, input.dpmm);

  if (input.printDirection === "left") {
    height -= height % 8;
  } else {
    width -= width % 8;
  }

  return {
    printDirection: input.printDirection,
    size: {
      width: Math.floor(width),
      height: Math.floor(height),
    },
    shape: input.shape ?? "rect",
    split: input.split ?? "none",
    splitParts: input.splitParts ?? 2,
    tailPos: input.tailPos ?? "right",
    tailLength: Math.floor(tailLength),
    mirror: input.mirror ?? "none",
  };
}

export function labelSizeMm(label: LabelProps, dpmm = DEFAULT_DPMM): { width: number; height: number } {
  return {
    width: Math.round(label.size.width / dpmm),
    height: Math.round(label.size.height / dpmm),
  };
}

export function formatLabelSize(label: LabelProps, dpmm = DEFAULT_DPMM): string {
  const size = labelSizeMm(label, dpmm);
  return `${size.width}×${size.height}mm`;
}

export function formatPresetSize(preset: LabelPreset): string {
  if (preset.unit === "mm") {
    return `${preset.width}×${preset.height}mm`;
  }
  return `${preset.width}×${preset.height}px`;
}

export function rotateLabelProps(label: LabelProps): LabelProps {
  return {
    ...label,
    printDirection: label.printDirection === "left" ? "top" : "left",
    size: {
      width: label.size.height,
      height: label.size.width,
    },
  };
}
