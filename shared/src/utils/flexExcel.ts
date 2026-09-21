import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FLEX_ZONE_IDS,
  FLEX_ZONE_LABELS,
  FLEX_ZONE_PRICES,
  type FlexZoneId,
} from '../constants/flex';
import {
  buildFlexMonthRows,
  summarizeFlexMonth,
  type FlexShipment,
} from './flex';

const HEADER = 'FF1F4E79';
const COL_CABA = 'FFD6EAF8';
const COL_Z1 = 'FFFAD7A0';
const COL_Z2 = 'FFF9E79F';
const COL_Z3 = 'FFF5B041';
const COL_PEDIDOS = 'FFD4E6F1';
const COL_RECAUDADO = 'FFD5F5E3';
const WHITE = 'FFFFFFFF';
const MONEY_FMT = '"$"#,##0.00';

function solid(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFBFBFBF' } };
  return { top: side, left: side, bottom: side, right: side };
}

const ZONE_FILLS: Record<FlexZoneId, string> = {
  caba: COL_CABA,
  zona1: COL_Z1,
  zona2: COL_Z2,
  zona3: COL_Z3,
};

export async function buildFlexMonthExcelBuffer(params: {
  month: Date;
  shipments: FlexShipment[];
}): Promise<ArrayBuffer> {
  const { month, shipments } = params;
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const rows = buildFlexMonthRows(month, shipments);
  const summary = summarizeFlexMonth(rows);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Advance Coat';
  const ws = wb.addWorksheet('Control mensual', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.mergeCells('A1:G1');
  const title = ws.getCell('A1');
  title.value = 'CONTROL MENSUAL DE PEDIDOS';
  title.font = { bold: true, size: 16, color: { argb: HEADER } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:G2');
  const subtitle = ws.getCell('A2');
  subtitle.value = monthLabel;
  subtitle.font = { bold: true, size: 12, color: { argb: HEADER } };
  subtitle.alignment = { horizontal: 'center' };

  // Precios referencia (columna I-J)
  ws.getCell('I1').value = 'Precios';
  ws.getCell('I1').font = { bold: true };
  let priceRow = 2;
  for (const zone of FLEX_ZONE_IDS) {
    ws.getCell(`I${priceRow}`).value = FLEX_ZONE_LABELS[zone];
    ws.getCell(`J${priceRow}`).value = FLEX_ZONE_PRICES[zone];
    ws.getCell(`J${priceRow}`).numFmt = MONEY_FMT;
    priceRow += 1;
  }

  const headerRow = ws.getRow(3);
  const headers = [
    'Fecha',
    'CABA',
    'Zona 1',
    'Zona 2',
    'Zona 3',
    'Total Pedidos',
    'Total Recaudado',
  ];
  headers.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = solid(HEADER);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder();
  });
  headerRow.height = 22;

  rows.forEach((row, index) => {
    const excelRow = ws.getRow(4 + index);
    excelRow.getCell(1).value = row.day;
    excelRow.getCell(2).value = row.counts.caba;
    excelRow.getCell(3).value = row.counts.zona1;
    excelRow.getCell(4).value = row.counts.zona2;
    excelRow.getCell(5).value = row.counts.zona3;
    excelRow.getCell(6).value = row.totalPedidos;
    excelRow.getCell(7).value = row.totalRecaudado;
    excelRow.getCell(7).numFmt = MONEY_FMT;

    const fills = [null, COL_CABA, COL_Z1, COL_Z2, COL_Z3, COL_PEDIDOS, COL_RECAUDADO];
    for (let c = 1; c <= 7; c++) {
      const cell = excelRow.getCell(c);
      cell.border = thinBorder();
      cell.alignment = { horizontal: 'center' };
      if (fills[c]) cell.fill = solid(fills[c]!);
    }
  });

  const summaryStart = 4 + rows.length + 2;
  ws.getCell(`A${summaryStart}`).value = 'Resumen del mes';
  ws.getCell(`A${summaryStart}`).font = { bold: true, size: 12, color: { argb: HEADER } };

  const summaryLines: Array<{ label: string; value: number | string; fill?: string; money?: boolean }> = [
    { label: 'Total de pedidos CABA', value: summary.counts.caba, fill: COL_CABA },
    { label: 'Total de pedidos Zona 1', value: summary.counts.zona1, fill: COL_Z1 },
    { label: 'Total de pedidos Zona 2', value: summary.counts.zona2, fill: COL_Z2 },
    { label: 'Total de pedidos Zona 3', value: summary.counts.zona3, fill: COL_Z3 },
    { label: 'Total de pedidos del mes', value: summary.totalPedidos, fill: COL_PEDIDOS },
    {
      label: 'Total facturado del mes',
      value: summary.totalRecaudado,
      fill: COL_RECAUDADO,
      money: true,
    },
  ];

  summaryLines.forEach((line, i) => {
    const r = summaryStart + 1 + i;
    const labelCell = ws.getCell(`A${r}`);
    const valueCell = ws.getCell(`B${r}`);
    labelCell.value = line.label;
    labelCell.border = thinBorder();
    if (line.fill) labelCell.fill = solid(line.fill);
    valueCell.value = line.value;
    valueCell.border = thinBorder();
    if (line.fill) valueCell.fill = solid(line.fill);
    if (line.money) valueCell.numFmt = MONEY_FMT;
    valueCell.font = { bold: true };
  });

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 12;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 16;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 12;

  // Hoja de detalle por localidad
  const detail = wb.addWorksheet('Por localidad');
  detail.getRow(1).values = ['Localidad', 'Zona', 'Pedidos', 'Recaudado'];
  for (let c = 1; c <= 4; c++) {
    const cell = detail.getRow(1).getCell(c);
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = solid(HEADER);
    cell.border = thinBorder();
  }

  const localityMap = new Map<string, { zone: FlexZoneId; qty: number; revenue: number }>();
  for (const s of shipments) {
    const key = `${s.zone}::${s.locality}`;
    const cur = localityMap.get(key) ?? { zone: s.zone, qty: 0, revenue: 0 };
    cur.qty += s.quantity;
    cur.revenue += s.total;
    localityMap.set(key, cur);
  }
  const localityRows = [...localityMap.entries()]
    .map(([key, v]) => ({
      locality: key.split('::')[1] ?? '',
      zone: v.zone,
      qty: v.qty,
      revenue: v.revenue,
    }))
    .sort((a, b) => b.qty - a.qty);

  localityRows.forEach((row, i) => {
    const r = detail.getRow(i + 2);
    r.getCell(1).value = row.locality;
    r.getCell(2).value = FLEX_ZONE_LABELS[row.zone];
    r.getCell(3).value = row.qty;
    r.getCell(4).value = row.revenue;
    r.getCell(4).numFmt = MONEY_FMT;
    r.getCell(2).fill = solid(ZONE_FILLS[row.zone]);
    for (let c = 1; c <= 4; c++) r.getCell(c).border = thinBorder();
  });
  detail.getColumn(1).width = 22;
  detail.getColumn(2).width = 12;
  detail.getColumn(3).width = 12;
  detail.getColumn(4).width = 14;

  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}
