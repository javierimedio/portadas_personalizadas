import ExcelJS from "exceljs";
import type { CatalogoDef } from "@/shared/domain/catalogos";
import type { ExportRow, ResumenRow } from "../domain/export-excel";

// Réplica de la construcción visual del Excel en exportExcel() (index.html
// ~3832-4004, PAN-07 a PAN-10): 2 hojas, cabecera de 3 filas (título +
// grupos + columnas), colores por catálogo, zebra striping, fila roja si
// incompleta, celda verde si "Confirmada", 3 filas congeladas. Los datos ya
// vienen calculados (buildExportRows/buildResumenRows) — este módulo solo
// construye el archivo binario, por eso vive en infrastructure/ y no en
// domain/ (usa ExcelJS directamente, no es una función pura).
const BLACK = "FF000000";
const WHITE = "FFFFFFFF";
const DARK = "FF2C2C2A";
const MID = "FF888780";
const LIGHT = "FFF1EFE8";
const BLUE = "FF003087";
const BLUE_L = "FFD0DCF0";
const BLUE_LL = "FFE5EAF3";
const YELLW = "FFFAB518";
const YELLL = "FFFDE9A0";
const YELLLL = "FFFEF3D0";
const RED = "FFE30613";
const RED_L = "FFFBC8C8";
const RED_LL = "FFFDECEA";
const GREEN = "FF3B6D11";
const GREEN_L = "FFEAF3DE";
const AMBER = "FF7A5A00";

function fill(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } };
}
function font(argb: string, bold = false, size = 9) {
  return { name: "Arial", size, bold, color: { argb } };
}
const border = {
  top: { style: "thin" as const, color: { argb: "FFD3D1C7" } },
  bottom: { style: "thin" as const, color: { argb: "FFD3D1C7" } },
  left: { style: "thin" as const, color: { argb: "FFD3D1C7" } },
  right: { style: "thin" as const, color: { argb: "FFD3D1C7" } },
};
const centerAlign = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true };
const leftAlign = { horizontal: "left" as const, vertical: "middle" as const, wrapText: true };

function styleCell(cell: ExcelJS.Cell, fg: string, bg: string, bold = false, size = 9, align: "center" | "left" = "center") {
  cell.font = font(fg, bold, size);
  cell.fill = fill(bg);
  cell.border = border;
  cell.alignment = align === "center" ? centerAlign : leftAlign;
}

const CAT_GROUP_BG: Record<string, string> = { roly: BLUE, roly_wrk: YELLW, stamina: RED, xmas: RED };
const CAT_GROUP_FG: Record<string, string> = { roly: WHITE, roly_wrk: BLACK, stamina: WHITE, xmas: WHITE };
const CAT_PALETTE: Record<string, { main: string; light: string; accent: string; accentBg: string }> = {
  roly: { main: BLUE, light: BLUE_LL, accent: WHITE, accentBg: BLUE },
  roly_wrk: { main: AMBER, light: YELLLL, accent: BLACK, accentBg: YELLW },
  stamina: { main: RED, light: RED_LL, accent: WHITE, accentBg: RED },
  xmas: { main: RED, light: RED_LL, accent: WHITE, accentBg: RED },
};

function colsPorCatalogo(cat: CatalogoDef) {
  return cat.hasDisenoProp ? 10 : 9;
}

export async function buildWorkbook(
  campanaNombre: string,
  cats: CatalogoDef[],
  dataRows: ExportRow[],
  resumenRows: ResumenRow[]
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Portadas");

  ws.columns = [
    { width: 12 },
    { width: 30 },
    { width: 18 },
    { width: 14 },
    { width: 16 },
    ...cats.flatMap((cat) => {
      const widths = [{ width: 9 }, { width: 9 }, { width: 22 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 14 }, { width: 14 }, { width: 9 }];
      if (cat.hasDisenoProp) widths.push({ width: 14 });
      return widths;
    }),
    { width: 30 },
    { width: 16 },
    { width: 32 },
  ];

  const totalCols = 5 + cats.reduce((a, c) => a + colsPorCatalogo(c), 0) + 3;

  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = campanaNombre;
  styleCell(titleCell, WHITE, BLACK, true, 13, "center");
  ws.getRow(1).height = 26;

  let gStart = 6;
  const catGroups = cats.map((cat) => {
    const cols = colsPorCatalogo(cat);
    const g = { label: cat.label, s: gStart, e: gStart + cols - 1, bg: CAT_GROUP_BG[cat.key] || DARK, fg: CAT_GROUP_FG[cat.key] || WHITE };
    gStart += cols;
    return g;
  });
  const stateStart = gStart;
  const groups = [
    { label: "DATOS GENERALES", s: 1, e: 5, bg: BLACK, fg: WHITE },
    ...catGroups,
    { label: "CAMPAÑA / ESTADO", s: stateStart, e: stateStart + 2, bg: DARK, fg: WHITE },
  ];
  groups.forEach((g) => {
    ws.mergeCells(2, g.s, 2, g.e);
    const cell = ws.getCell(2, g.s);
    cell.value = g.label;
    styleCell(cell, g.fg, g.bg, true, 11, "center");
  });
  ws.getRow(2).height = 22;

  const headers: [string, string, string][] = [
    ["CÓD. SAP", BLACK, LIGHT],
    ["NOMBRE EMPRESA", BLACK, LIGHT],
    ["COMERCIAL", BLACK, LIGHT],
    ["IDIOMA", BLACK, LIGHT],
    ["PROVINCIA", BLACK, LIGHT],
    ...cats.flatMap((cat) => {
      const p = CAT_PALETTE[cat.key] || { main: MID, light: LIGHT, accent: WHITE, accentBg: DARK };
      const base: [string, string, string][] = [
        ["DIGITAL", p.main, p.light],
        ["IMPRESO", p.main, p.light],
        ["PORTADA PERSONALIZADA", p.main, p.light],
        ["SELECCIÓN 1", p.main, p.light],
        ["SELECCIÓN 2", p.main, p.light],
        ["SELECCIÓN 3", p.main, p.light],
        ["PORTADA ELEGIDA", p.accent, p.accentBg],
        ["POSICIÓN LOGO", p.main, p.light],
        ["UNDS.", p.main, p.light],
      ];
      if (cat.hasDisenoProp) base.push(["CON PRECIOS", p.main, p.light]);
      return base;
    }),
    ["COMENTARIOS", MID, LIGHT],
    ["ESTADO", MID, LIGHT],
    ["CAMPOS INCOMPLETOS", MID, LIGHT],
  ];
  headers.forEach(([label, fg, bg], i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value = label;
    styleCell(cell, fg, bg, true, 8, "center");
  });
  ws.getRow(3).height = 22;

  const estadoColIndex = 5 + cats.reduce((a, c) => a + colsPorCatalogo(c), 0) + 1; // 0-based índice de "ESTADO" en `dataRows`

  dataRows.forEach((row, ri) => {
    const isIncomplete = row[row.length - 1] !== "✓ Completa";
    const exRow = ws.getRow(ri + 4);
    exRow.height = 18;

    row.forEach((val, ci) => {
      const cell = exRow.getCell(ci + 1);
      cell.value = val;
      cell.border = border;

      let bg: string;
      let fg: string;
      let catBg: string | null = null;
      let catFg: string | null = null;
      let colStart = 5;
      for (const cat of cats) {
        const span = colsPorCatalogo(cat);
        if (ci >= colStart && ci < colStart + span) {
          const p = CAT_PALETTE[cat.key] || { light: LIGHT, main: DARK, accent: WHITE, accentBg: DARK };
          catBg = ri % 2 === 0 ? p.light : p.light === BLUE_LL ? BLUE_L : p.light === YELLLL ? YELLL : p.light === RED_LL ? RED_L : p.light;
          catFg = p.main;
          break;
        }
        colStart += span;
      }

      if (isIncomplete) {
        bg = RED_LL;
        fg = RED;
      } else if (catBg) {
        bg = catBg;
        fg = catFg ?? DARK;
      } else if (ci === estadoColIndex) {
        const isOk = val === "Confirmada";
        bg = isOk ? GREEN_L : ri % 2 === 0 ? WHITE : LIGHT;
        fg = isOk ? GREEN : DARK;
      } else {
        bg = ri % 2 === 0 ? WHITE : LIGHT;
        fg = DARK;
      }

      styleCell(cell, fg, bg, false, 9, ci <= 1 ? "left" : "center");
    });
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 3, topLeftCell: "A4", activeCell: "A4" }];

  const ws2 = wb.addWorksheet("Resumen");
  resumenRows.forEach(([label, val], i) => {
    ws2.getCell(i + 1, 1).value = label;
    ws2.getCell(i + 1, 2).value = val;
    ws2.getCell(i + 1, 1).font = font(DARK, false, 9);
    ws2.getCell(i + 1, 2).font = font(DARK, true, 9);
  });
  ws2.getColumn(1).width = 22;
  ws2.getColumn(2).width = 20;

  return wb.xlsx.writeBuffer();
}
