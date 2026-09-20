import type { ExportedLabelTemplate, LabelProps } from "$/types";
import { DEFAULT_DPMM, labelSizeMm } from "$/utils/label_geometry";

/** Deep-clone a saved or starter label without Svelte proxies or Fabric instances. */
export function cloneLabelTemplate(label: ExportedLabelTemplate): ExportedLabelTemplate {
  try {
    return JSON.parse(JSON.stringify(label)) as ExportedLabelTemplate;
  } catch {
    return {
      id: label.id,
      title: label.title,
      timestamp: label.timestamp,
      thumbnailBase64: typeof label.thumbnailBase64 === "string" ? label.thumbnailBase64 : undefined,
      csv: label.csv,
      label: {
        ...label.label,
        size: {
          width: label.label.size.width,
          height: label.label.size.height,
        },
      },
      canvas: {
        version: String(label.canvas?.version ?? "7.3.0"),
        objects: Array.isArray(label.canvas?.objects)
          ? (label.canvas.objects as object[]).map((object) => ({ ...object }))
          : [],
      } as ExportedLabelTemplate["canvas"],
    };
  }
}

const TOP_FEED_MM = [[40, 20]] as const;
const LEFT_FEED_MM = [[40, 12]] as const;

/** Keep common roll sizes on the feed the printer expects. */
export function normalizeLabelPrintDirection(label: LabelProps, dpmm = DEFAULT_DPMM): LabelProps {
  const size = labelSizeMm(label, dpmm);
  const topFeed = TOP_FEED_MM.some(([width, height]) => size.width === width && size.height === height);
  const leftFeed = LEFT_FEED_MM.some(([width, height]) => size.width === width && size.height === height);
  if (topFeed && label.printDirection !== "top") {
    return { ...label, printDirection: "top" };
  }
  if (leftFeed && label.printDirection !== "left") {
    return { ...label, printDirection: "left" };
  }
  return label;
}
