import { DEFAULT_LABEL_PRESETS } from "$/defaults";
import type { ExportedLabelTemplate, FabricJson, LabelProps } from "$/types";
import { FileUtils } from "$/utils/file_utils";
import { labelPropsFromPreset } from "$/utils/label_geometry";

type FabricObjectDraft = {
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  textAlign?: string;
  originX?: string;
  originY?: string;
  angle?: number;
  ecl?: string;
  mode?: string;
  qrVersion?: number;
  encoding?: string;
};

type ObjectDraftInput = Omit<FabricObjectDraft, "type"> & { type?: string };

const textbox = (draft: ObjectDraftInput): FabricObjectDraft => {
  const { type, ...rest } = draft;
  return {
    fontFamily: "Noto Sans Variable",
    fill: "black",
    originX: "left",
    originY: "top",
    textAlign: "left",
    fontWeight: "normal",
    ...rest,
    type: type ?? "Textbox",
  };
};

const qr = (draft: ObjectDraftInput): FabricObjectDraft => ({
  type: "QRCode",
  ecl: "M",
  mode: "Byte",
  qrVersion: 0,
  fill: "#ffffff",
  stroke: "#000000",
  ...draft,
});

const barcode = (draft: ObjectDraftInput): FabricObjectDraft => ({
  type: "Barcode",
  encoding: "CODE128B",
  fill: "black",
  ...draft,
});

const canvasOf = (objects: FabricObjectDraft[]): FabricJson =>
  ({
    version: "7.3.0",
    objects,
  }) as FabricJson;

const template = (title: string, category: string, label: LabelProps, objects: FabricObjectDraft[]): ExportedLabelTemplate => ({
  id: `starter_${category}_${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
  title,
  timestamp: FileUtils.timestamp(),
  label,
  canvas: canvasOf(objects),
});

const vial40x20 = labelPropsFromPreset(DEFAULT_LABEL_PRESETS[0]);
const strip40x12 = labelPropsFromPreset(DEFAULT_LABEL_PRESETS[1]);
const tag50x30 = labelPropsFromPreset(DEFAULT_LABEL_PRESETS[2]);

export function emptyLabelTemplate(label: LabelProps, title: string): ExportedLabelTemplate {
  return {
    canvas: canvasOf([]),
    label,
    title,
    timestamp: FileUtils.timestamp(),
  };
}

export function getStarterTemplates(): ExportedLabelTemplate[] {
  return [
    template("Vial QR", "lab", vial40x20, [
      textbox({ left: 16, top: 12, width: 180, fontSize: 18, fontWeight: "bold", text: "Sample" }),
      qr({ left: 16, top: 48, width: 88, height: 88, text: "SAMPLE-001" }),
      textbox({ left: 116, top: 52, width: 170, fontSize: 16, fontWeight: "bold", text: "Compound A" }),
      textbox({ left: 116, top: 78, width: 170, fontSize: 12, text: "10mg" }),
      textbox({ left: 116, top: 100, width: 170, fontSize: 11, text: "Research Use Only" }),
      textbox({ left: 116, top: 122, width: 170, fontSize: 11, text: "Expires {dt|YYYY-MM-DD}" }),
    ]),
    template("Vial Name", "lab", vial40x20, [
      textbox({ left: 18, top: 20, width: 280, fontSize: 20, fontWeight: "bold", text: "Peptide-01" }),
      textbox({ left: 18, top: 56, width: 280, fontSize: 14, text: "10mg" }),
      textbox({ left: 18, top: 84, width: 280, fontSize: 12, text: "Research Use Only" }),
      textbox({ left: 18, top: 118, width: 280, fontSize: 12, text: "Expires {dt|YYYY-MM-DD}" }),
    ]),
    template("Inventory barcode", "warehouse", tag50x30, [
      textbox({ left: 16, top: 12, width: 360, fontSize: 16, fontWeight: "bold", text: "SKU-18420" }),
      barcode({ left: 16, top: 48, width: 360, height: 90, text: "18420001234" }),
      textbox({ left: 16, top: 150, width: 360, fontSize: 11, text: "Shelf B / Bin 12" }),
    ]),
    template("Name badge", "office", tag50x30, [
      textbox({ left: 20, top: 36, width: 360, fontSize: 22, fontWeight: "bold", textAlign: "center", originX: "center", text: "Alex Rivera" }),
      textbox({ left: 20, top: 90, width: 360, fontSize: 13, textAlign: "center", originX: "center", text: "Lab Technician" }),
      textbox({ left: 20, top: 130, width: 360, fontSize: 11, textAlign: "center", originX: "center", text: "Building 3" }),
    ]),
    template("Date stamp", "office", strip40x12, [
      textbox({ left: 12, top: 10, width: 200, fontSize: 13, fontWeight: "bold", text: "Packed {dt|YYYY-MM-DD}" }),
      textbox({ left: 12, top: 42, width: 200, fontSize: 11, text: "{dt|HH:mm}" }),
      qr({ left: 230, top: 8, width: 80, height: 80, text: "{dt|YYYYMMDDHHmm}" }),
    ]),
    template("QR link", "general", vial40x20, [
      qr({ left: 16, top: 24, width: 112, height: 112, text: "https://niim.blue" }),
      textbox({ left: 144, top: 36, width: 150, fontSize: 16, fontWeight: "bold", text: "Scan to open" }),
      textbox({ left: 144, top: 72, width: 150, fontSize: 11, text: "niim.blue" }),
    ]),
  ];
}

export function isStarterTemplate(id?: string): boolean {
  return !!id?.startsWith("starter_");
}
