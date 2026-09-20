import { csvFormat, csvParse } from "d3-dsv";

export const CSV_FIELD_MIME = "application/x-niimblue-csv-field";

export type CsvRow = Record<string, string>;

export type CsvTable = {
  columns: string[];
  rows: CsvRow[];
};

const normalizeCell = (value: unknown): string => String(value ?? "").replaceAll("\\n", "\n");

export const parseCsvTable = (data: string): CsvTable => {
  const result = csvParse(data ?? "");
  const columns = (result.columns ?? []).filter((column): column is string => !!column && column.trim() !== "");
  const rows = result.map((row) => {
    const next: CsvRow = {};
    for (const column of columns) {
      next[column] = normalizeCell(row[column]);
    }
    return next;
  });
  return { columns, rows };
};

export const serializeCsvTable = (columns: string[], rows: CsvRow[]): string => {
  return csvFormat(
    rows.map((row) => {
      const next: CsvRow = {};
      for (const column of columns) {
        next[column] = row[column] ?? "";
      }
      return next;
    }),
    columns,
  );
};

export const cloneCsvTable = (table: CsvTable): CsvTable => ({
  columns: [...table.columns],
  rows: table.rows.map((row) => {
    const next: CsvRow = {};
    for (const column of table.columns) {
      next[column] = row[column] ?? "";
    }
    return next;
  }),
});

export const uniqueColumnName = (columns: string[], desired: string, skipIndex = -1): string => {
  const base = desired.trim() || "Column";
  const taken = columns.filter((_, index) => index !== skipIndex);
  if (!taken.includes(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.includes(`${base} ${suffix}`)) {
    suffix += 1;
  }
  return `${base} ${suffix}`;
};

export const emptyCsvRow = (columns: string[]): CsvRow => {
  const next: CsvRow = {};
  for (const column of columns) {
    next[column] = "";
  }
  return next;
};

export type CsvImportResult = {
  selected: number[];
  printColumnNames: boolean;
  table: CsvTable;
};

export const csvFileTitle = (filename: string): string => filename.replace(/\.[^.]+$/, "").trim() || filename;

export const csvVariableToken = (name: string): string => `{${name}}`;

export const rowMatchesQuery = (row: CsvRow, columns: string[], query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return columns.some((column) => (row[column] ?? "").toLowerCase().includes(needle));
};

export const MAX_COPY_COUNT = 999;

export type PrintQtyMode = "same" | "each" | "column";

export type AdvancedPrintPlan = {
  selected: number[];
  quantities: number[];
  mode: PrintQtyMode;
  column?: string;
};

/** Parse a cell into a print count. Empty or invalid values use fallback. */
export const parseCopyCount = (value: unknown, fallback = 1): number => {
  const raw = String(value ?? "").trim();
  if (raw === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(MAX_COPY_COUNT, Math.max(0, parsed));
};

export const csvRowRepeatCount = (row: CsvRow): number => {
  if (!Object.prototype.hasOwnProperty.call(row, "$times") || row["$times"] === "") {
    return 1;
  }
  return parseCopyCount(row["$times"], 1);
};

export const expandCsvPrintRows = (rows: CsvRow[]): CsvRow[] => {
  const spread: CsvRow[] = [];
  for (const row of rows) {
    const times = csvRowRepeatCount(row);
    for (let i = 0; i < times; i++) {
      spread.push(row);
    }
  }
  return spread;
};
