import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Sale } from '../types/index';
import { formatShortDateTime, getSaleDisplayDate } from './format';
import {
  buildSalesHistoryPaymentSummary,
  formatSaleOperationDescription,
} from './salesReport';
import { getSalePaymentLabel } from '../constants/payments';
import { RESIN_UNIT_LABELS, type ResinUnitKey } from '../constants/resinAccounting';
import {
  computeResinAccounting,
  computeSaleResinMoney,
  type ResinAccountingOptions,
  type ResinAccountingTotals,
} from './resinAccounting';

const COLORS = {
  primary: 'FF1A1A2E',
  accent: 'FF4C6FFF',
  accentLight: 'FFE8EEFF',
  resin: 'FFE94560',
  success: 'FF10B981',
  warning: 'FFF59E0B',
  white: 'FFFFFFFF',
  muted: 'FF6B7280',
  altRow: 'FFF8F9FC',
  border: 'FFE8ECF4',
  barPayment: 'FF4C6FFF',
  barResin: 'FFE94560',
  barUnit: 'FF10B981',
};

const MONEY_FMT = '"$"#,##0';
const RESIN_UNIT_KEYS: ResinUnitKey[] = [
  '150g',
  '300g',
  '750g',
  '1.5kg',
  '3kg',
  'catalizador',
  'dr',
  'bel',
];

export interface SalesReportExcelParams {
  sales: Sale[];
  start: Date;
  end: Date;
  label: string;
  resinOptions?: ResinAccountingOptions;
}

function solidFill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COLORS.border } };
  return { top: side, left: side, bottom: side, right: side };
}

function styleHeaderRow(row: ExcelJS.Row, colCount: number): void {
  row.height = 22;
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.font = { bold: true, color: { argb: COLORS.white }, size: 11 };
    cell.fill = solidFill(COLORS.accent);
    cell.alignment = { vertical: 'middle', horizontal: c === colCount ? 'right' : 'left' };
    cell.border = thinBorder();
  }
}

function styleSectionTitle(cell: ExcelJS.Cell, text: string): void {
  cell.value = text;
  cell.font = { bold: true, size: 12, color: { argb: COLORS.primary } };
  cell.fill = solidFill(COLORS.accentLight);
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.border = thinBorder();
}

function styleKpiLabel(cell: ExcelJS.Cell, text: string): void {
  cell.value = text;
  cell.font = { size: 10, color: { argb: COLORS.muted } };
  cell.fill = solidFill(COLORS.white);
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = thinBorder();
}

function styleKpiValue(cell: ExcelJS.Cell, value: string | number, color = COLORS.primary): void {
  cell.value = value;
  cell.font = { bold: true, size: 16, color: { argb: color } };
  cell.fill = solidFill(COLORS.white);
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = thinBorder();
}

function getTopProducts(sales: Sale[], limit = 5) {
  const map = new Map<string, { quantity: number; revenue: number }>();
  for (const sale of sales) {
    for (const item of sale.items ?? []) {
      const cur = map.get(item.productName) ?? { quantity: 0, revenue: 0 };
      cur.quantity += item.quantity;
      cur.revenue += item.subtotal;
      map.set(item.productName, cur);
    }
  }
  return [...map.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

function addBarCells(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  col: number,
  value: number,
  maxValue: number,
  color: string
): void {
  const BAR_LEN = 20;
  const cell = sheet.getRow(rowNum).getCell(col);
  if (maxValue <= 0 || value <= 0) {
    cell.value = '';
    cell.border = thinBorder();
    return;
  }
  const filled = Math.round((value / maxValue) * BAR_LEN);
  const safeFilled = Math.min(BAR_LEN, Math.max(0, filled));
  cell.value = '█'.repeat(safeFilled) + '░'.repeat(BAR_LEN - safeFilled);
  cell.font = { name: 'Consolas', size: 9, color: { argb: color } };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.border = thinBorder();
}

function writePaymentBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  payments: ReturnType<typeof buildSalesHistoryPaymentSummary>,
  withChart: boolean,
  mergeCols = 6
): number {
  let row = startRow;
  const chartEndCol = withChart ? 3 : mergeCols;
  sheet.mergeCells(row, 1, row, chartEndCol);
  styleSectionTitle(sheet.getCell(row, 1), 'Totales por forma de pago');
  row++;

  const dataRows = payments.filter((p) => p['Forma de pago'] !== 'TOTAL');
  const maxPay = Math.max(...dataRows.map((p) => p['Plata ingresada']), 1);

  const header = sheet.getRow(row);
  header.getCell(1).value = 'Forma de pago';
  header.getCell(2).value = 'Plata ingresada';
  if (withChart) header.getCell(3).value = 'Distribución';
  styleHeaderRow(header, withChart ? 3 : 2);
  row++;

  for (const item of payments) {
    const dataRow = sheet.getRow(row);
    const isTotal = item['Forma de pago'] === 'TOTAL';
    dataRow.getCell(1).value = item['Forma de pago'];
    dataRow.getCell(2).value = item['Plata ingresada'];
    dataRow.getCell(2).numFmt = MONEY_FMT;
    dataRow.getCell(1).font = { bold: isTotal };
    dataRow.getCell(2).font = { bold: isTotal };
    if (isTotal) {
      dataRow.getCell(1).fill = solidFill(COLORS.accentLight);
      dataRow.getCell(2).fill = solidFill(COLORS.accentLight);
    }
    dataRow.getCell(1).border = thinBorder();
    dataRow.getCell(2).border = thinBorder();
    if (withChart && !isTotal) {
      addBarCells(sheet, row, 3, item['Plata ingresada'], maxPay, COLORS.barPayment);
    } else if (withChart) {
      dataRow.getCell(3).border = thinBorder();
    }
    row++;
  }

  return row + 1;
}

function writeResinBlock(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  totals: ResinAccountingTotals,
  withChart: boolean,
  mergeCols = 6
): number {
  let row = startRow;
  const chartEndCol = withChart ? 3 : mergeCols;
  sheet.mergeCells(row, 1, row, chartEndCol);
  styleSectionTitle(sheet.getCell(row, 1), 'Contabilización resina');
  row++;

  const maxUnits = Math.max(...RESIN_UNIT_KEYS.map((k) => totals.units[k]), 1);

  const unitsHeader = sheet.getRow(row);
  unitsHeader.getCell(1).value = 'Presentación';
  unitsHeader.getCell(2).value = 'Unidades';
  if (withChart) unitsHeader.getCell(3).value = 'Gráfico';
  styleHeaderRow(unitsHeader, withChart ? 3 : 2);
  row++;

  for (const key of RESIN_UNIT_KEYS) {
    const dataRow = sheet.getRow(row);
    dataRow.getCell(1).value = RESIN_UNIT_LABELS[key];
    dataRow.getCell(2).value = totals.units[key];
    dataRow.getCell(1).border = thinBorder();
    dataRow.getCell(2).border = thinBorder();
    if (withChart) {
      addBarCells(sheet, row, 3, totals.units[key], maxUnits, COLORS.barUnit);
    }
    row++;
  }

  row++;
  sheet.mergeCells(row, 1, row, mergeCols);
  styleSectionTitle(sheet.getCell(row, 1), 'Plata resina vs extras');
  row++;

  const moneyRows: [string, number, string][] = [
    ['Recibido resina (incl. catalizadores)', totals.resinMoney, COLORS.resin],
    ['Plata de extras (DR, BEL y resto)', totals.extrasMoney, COLORS.warning],
    ['TOTAL contabilizado', totals.resinMoney + totals.extrasMoney, COLORS.primary],
  ];
  const maxMoney = Math.max(totals.resinMoney, totals.extrasMoney, 1);

  for (const [label, amount, color] of moneyRows) {
    const dataRow = sheet.getRow(row);
    const isTotal = label.startsWith('TOTAL');
    dataRow.getCell(1).value = label;
    dataRow.getCell(2).value = amount;
    dataRow.getCell(2).numFmt = MONEY_FMT;
    dataRow.getCell(1).font = { bold: isTotal };
    dataRow.getCell(2).font = { bold: isTotal, color: { argb: color } };
    dataRow.getCell(1).border = thinBorder();
    dataRow.getCell(2).border = thinBorder();
    if (withChart && !isTotal) {
      addBarCells(sheet, row, 3, amount, maxMoney, color);
    } else if (withChart) {
      dataRow.getCell(3).border = thinBorder();
    }
    row++;
  }

  return row + 1;
}

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  params: SalesReportExcelParams,
  payments: ReturnType<typeof buildSalesHistoryPaymentSummary>,
  resinTotals: ResinAccountingTotals | null
): void {
  const sheet = workbook.addWorksheet('Resumen', {
    views: [{ showGridLines: false }],
  });
  sheet.columns = [
    { width: 28 },
    { width: 18 },
    { width: 22 },
  ];

  const { sales, label, start, end } = params;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + (s.discountAmount ?? 0), 0);
  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
  const topProducts = getTopProducts(sales, 5);

  let row = 1;
  sheet.mergeCells(row, 1, row, 6);
  const titleCell = sheet.getCell(row, 1);
  titleCell.value = 'Advance Coat — Informe de ventas';
  titleCell.font = { bold: true, size: 18, color: { argb: COLORS.white } };
  titleCell.fill = solidFill(COLORS.primary);
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(row).height = 36;
  row++;

  sheet.mergeCells(row, 1, row, 6);
  const metaCell = sheet.getCell(row, 1);
  metaCell.value = `${label} · ${format(start, 'dd/MM/yyyy')} – ${format(end, 'dd/MM/yyyy')} · Generado ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`;
  metaCell.font = { size: 10, color: { argb: COLORS.muted } };
  metaCell.alignment = { horizontal: 'center' };
  row += 2;

  const kpiRow1 = row;
  sheet.mergeCells(kpiRow1, 1, kpiRow1, 2);
  sheet.mergeCells(kpiRow1, 3, kpiRow1, 4);
  sheet.mergeCells(kpiRow1, 5, kpiRow1, 6);
  styleKpiLabel(sheet.getCell(kpiRow1, 1), 'Ventas');
  styleKpiLabel(sheet.getCell(kpiRow1, 3), 'Recaudación');
  styleKpiLabel(sheet.getCell(kpiRow1, 5), 'Ticket promedio');
  row++;
  const kpiRow2 = row;
  sheet.mergeCells(kpiRow2, 1, kpiRow2, 2);
  sheet.mergeCells(kpiRow2, 3, kpiRow2, 4);
  sheet.mergeCells(kpiRow2, 5, kpiRow2, 6);
  styleKpiValue(sheet.getCell(kpiRow2, 1), sales.length, COLORS.accent);
  styleKpiValue(sheet.getCell(kpiRow2, 3), totalRevenue, COLORS.success);
  sheet.getCell(kpiRow2, 3).numFmt = MONEY_FMT;
  styleKpiValue(sheet.getCell(kpiRow2, 5), avgTicket);
  sheet.getCell(kpiRow2, 5).numFmt = MONEY_FMT;
  sheet.getRow(kpiRow2).height = 28;
  row += 2;

  sheet.mergeCells(row, 1, row, 3);
  sheet.mergeCells(row, 4, row, 6);
  styleKpiLabel(sheet.getCell(row, 1), 'Descuentos aplicados');
  styleKpiLabel(sheet.getCell(row, 4), 'Unidades vendidas (ítems)');
  row++;
  sheet.mergeCells(row, 1, row, 3);
  sheet.mergeCells(row, 4, row, 6);
  styleKpiValue(sheet.getCell(row, 1), totalDiscount, COLORS.warning);
  sheet.getCell(row, 1).numFmt = MONEY_FMT;
  const totalUnits = sales.reduce(
    (sum, s) => sum + (s.items ?? []).reduce((u, i) => u + i.quantity, 0),
    0
  );
  styleKpiValue(sheet.getCell(row, 4), totalUnits);
  row += 2;

  if (topProducts.length > 0) {
    sheet.mergeCells(row, 1, row, 6);
    styleSectionTitle(sheet.getCell(row, 1), 'Top productos del período');
    row++;
    const tpHeader = sheet.getRow(row);
    tpHeader.getCell(1).value = '#';
    tpHeader.getCell(2).value = 'Producto';
    tpHeader.getCell(4).value = 'Unidades';
    tpHeader.getCell(5).value = 'Ingresos';
    styleHeaderRow(tpHeader, 5);
    sheet.mergeCells(row, 2, row, 3);
    row++;
    topProducts.forEach((p, index) => {
      const r = sheet.getRow(row);
      r.getCell(1).value = index + 1;
      r.getCell(2).value = p.name;
      r.getCell(4).value = p.quantity;
      r.getCell(5).value = p.revenue;
      r.getCell(5).numFmt = MONEY_FMT;
      sheet.mergeCells(row, 2, row, 3);
      for (let c = 1; c <= 5; c++) {
        r.getCell(c).border = thinBorder();
        if (index % 2 === 1) r.getCell(c).fill = solidFill(COLORS.altRow);
      }
      row++;
    });
    row++;
  }

  row = writePaymentBlock(sheet, row, payments, true);
  if (resinTotals) {
    row = writeResinBlock(sheet, row, resinTotals, true);
  }
}

function buildInformeSheet(
  workbook: ExcelJS.Workbook,
  params: SalesReportExcelParams,
  payments: ReturnType<typeof buildSalesHistoryPaymentSummary>,
  resinTotals: ResinAccountingTotals | null
): void {
  const hasResin = !!params.resinOptions;
  const colCount = hasResin ? 6 : 4;

  const sheet = workbook.addWorksheet('Informe');
  sheet.columns = [
    { width: 20 },
    { width: 52 },
    { width: 24 },
    { width: 16 },
    ...(hasResin ? [{ width: 16 }, { width: 16 }] : []),
  ];

  const { sales, label, resinOptions } = params;
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  let totalResin = 0;
  let totalExtras = 0;

  let row = 1;
  sheet.mergeCells(row, 1, row, colCount);
  const title = sheet.getCell(row, 1);
  title.value = `Detalle de ventas — ${label}`;
  title.font = { bold: true, size: 14, color: { argb: COLORS.white } };
  title.fill = solidFill(COLORS.primary);
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(row).height = 28;
  row += 2;

  const header = sheet.getRow(row);
  header.getCell(1).value = 'Fecha de compra';
  header.getCell(2).value = 'Descripción de operación';
  header.getCell(3).value = 'Forma de pago';
  header.getCell(4).value = 'Plata ingresada';
  if (hasResin) {
    header.getCell(5).value = 'Resina';
    header.getCell(6).value = 'Extras';
  }
  styleHeaderRow(header, colCount);
  row++;

  sales.forEach((sale, index) => {
    const r = sheet.getRow(row);
    const split = hasResin && resinOptions ? computeSaleResinMoney(sale, resinOptions) : null;
    r.getCell(1).value = formatShortDateTime(getSaleDisplayDate(sale));
    r.getCell(2).value = formatSaleOperationDescription(sale);
    r.getCell(3).value = getSalePaymentLabel(sale);
    r.getCell(4).value = sale.total;
    r.getCell(4).numFmt = MONEY_FMT;
    if (split) {
      r.getCell(5).value = split.resinMoney;
      r.getCell(5).numFmt = MONEY_FMT;
      r.getCell(6).value = split.extrasMoney;
      r.getCell(6).numFmt = MONEY_FMT;
      totalResin += split.resinMoney;
      totalExtras += split.extrasMoney;
    }
    r.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    for (let c = 1; c <= colCount; c++) {
      r.getCell(c).border = thinBorder();
      if (index % 2 === 1) r.getCell(c).fill = solidFill(COLORS.altRow);
    }
    row++;
  });

  row++;
  const totalRow = sheet.getRow(row);
  totalRow.getCell(1).value = '';
  totalRow.getCell(2).value = 'TOTAL VENTAS';
  totalRow.getCell(3).value = `${sales.length} operaciones`;
  totalRow.getCell(4).value = totalRevenue;
  totalRow.getCell(4).numFmt = MONEY_FMT;
  if (hasResin) {
    totalRow.getCell(5).value = totalResin;
    totalRow.getCell(5).numFmt = MONEY_FMT;
    totalRow.getCell(6).value = totalExtras;
    totalRow.getCell(6).numFmt = MONEY_FMT;
  }
  for (let c = 1; c <= colCount; c++) {
    totalRow.getCell(c).font = { bold: true };
    totalRow.getCell(c).fill = solidFill(COLORS.accentLight);
    totalRow.getCell(c).border = thinBorder();
  }
  row += 2;

  row = writePaymentBlock(sheet, row, payments, false, colCount);
  if (resinTotals) {
    writeResinBlock(sheet, row, resinTotals, false, colCount);
  }

  sheet.views = [{ state: 'frozen', ySplit: 3 }];
}

export async function buildSalesReportExcelBuffer(params: SalesReportExcelParams): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Advance Coat';
  workbook.created = new Date();

  const payments = buildSalesHistoryPaymentSummary(params.sales);
  const resinTotals = params.resinOptions
    ? computeResinAccounting(params.sales, params.resinOptions)
    : null;

  buildSummarySheet(workbook, params, payments, resinTotals);
  buildInformeSheet(workbook, params, payments, resinTotals);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
