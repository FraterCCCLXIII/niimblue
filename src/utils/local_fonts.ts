/** Common installed faces to probe when Local Font Access returns nothing. */
const FONT_CANDIDATES = [
  "SF Pro",
  "SF Pro Text",
  "SF Pro Display",
  "SF Compact",
  "SF Mono",
  "New York",
  "Avenir",
  "Avenir Next",
  "Futura",
  "Optima",
  "Baskerville",
  "Didot",
  "Hoefler Text",
  "Iowan Old Style",
  "American Typewriter",
  "Andale Mono",
  "Arial Black",
  "Arial Narrow",
  "Avenir Next Condensed",
  "Big Caslon",
  "Bodoni 72",
  "Bradley Hand",
  "Brush Script MT",
  "Chalkboard SE",
  "Charter",
  "Cochin",
  "Copperplate",
  "DIN Alternate",
  "DIN Condensed",
  "Geneva",
  "Gill Sans",
  "Herculanum",
  "Lucida Grande",
  "Marker Felt",
  "Noteworthy",
  "Papyrus",
  "Phosphate",
  "Rockwell",
  "Savoye LET",
  "SignPainter",
  "Skia",
  "Snell Roundhand",
  "Superclarendon",
  "Zapfino",
  "Calibri",
  "Cambria",
  "Candara",
  "Consolas",
  "Constantia",
  "Corbel",
  "Franklin Gothic Medium",
  "Gabriola",
  "Georgia Pro",
  "Ink Free",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Microsoft Sans Serif",
  "Palatino Linotype",
  "Segoe Print",
  "Segoe Script",
  "Segoe UI",
  "Segoe UI Variable",
  "Sitka Text",
  "Trebuchet MS",
  "Yu Gothic",
  "Yu Gothic UI",
  "Malgun Gothic",
  "Microsoft YaHei",
  "SimSun",
  "PMingLiU",
  "Noto Sans CJK",
  "Noto Serif CJK",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Source Sans 3",
  "Source Serif 4",
  "Source Code Pro",
  "IBM Plex Sans",
  "IBM Plex Serif",
  "IBM Plex Mono",
  "Fira Sans",
  "Fira Code",
  "Ubuntu",
  "Cantarell",
  "DejaVu Sans",
  "DejaVu Serif",
  "DejaVu Sans Mono",
  "Liberation Sans",
  "Liberation Serif",
  "Liberation Mono",
];

const SAMPLE = "mmmmmmmmmmlliWw@";

export function detectInstalledFonts(extra: string[] = []): string[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return [];
  }

  const baselines = ["monospace", "serif", "sans-serif"] as const;
  const baseWidths = baselines.map((baseline) => {
    ctx.font = `72px ${baseline}`;
    return ctx.measureText(SAMPLE).width;
  });

  const seen = new Set<string>();
  const found: string[] = [];

  for (const family of [...extra, ...FONT_CANDIDATES]) {
    if (seen.has(family)) {
      continue;
    }
    seen.add(family);
    const available = baselines.some((baseline, index) => {
      ctx.font = `72px "${family}", ${baseline}`;
      return ctx.measureText(SAMPLE).width !== baseWidths[index];
    });
    if (available) {
      found.push(family);
    }
  }

  return found.sort((a, b) => a.localeCompare(b));
}

export async function readLocalFontFamilies(): Promise<string[]> {
  if (typeof queryLocalFonts !== "function") {
    return detectInstalledFonts();
  }

  try {
    const fonts = await queryLocalFonts();
    const families = [...new Set(fonts.map((font) => font.family))];
    if (families.length > 0) {
      return families.sort((a, b) => a.localeCompare(b));
    }
  } catch {
    // Fall through to canvas detection when permission is denied.
  }

  return detectInstalledFonts();
}
