import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Customer, Sale, DailyCaja } from '@advance-coat/shared';
import {
  getPaymentMethodLabel,
  formatCurrency,
  formatShortDate,
  buildSaleTicketText,
} from '@advance-coat/shared';
import { getMonthSales, getDaySales } from './sales';
import { getMonthCaja } from './caja';
import {
  getTopProducts,
  getPaymentMethodStats,
  getPaymentMethodRevenueStats,
} from './stats';

function buildSalesRows(sales: Sale[]) {
  return sales.map((sale) => ({
    Fecha: formatShortDate(sale.date),
    Hora: format(sale.date, 'HH:mm'),
    Cliente: sale.customer?.name ?? '',
    Email: sale.customer?.email ?? '',
    Teléfono: sale.customer?.phone ?? '',
    Productos: sale.items.map((i) => `${i.productName} x${i.quantity}`).join(' | '),
    Subtotal: sale.subtotal ?? sale.total,
    Descuento: sale.discountAmount ?? 0,
    'Forma de pago': getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel),
    Total: sale.total,
    'Paga con': sale.amountPaid ?? '',
    Vuelto: sale.change ?? '',
    Vendedor: sale.createdByName ?? '',
  }));
}

function buildProductRows(sales: Sale[]) {
  const products = getTopProducts(sales, 500).sort((a, b) => b.quantity - a.quantity);
  return products.map((product, index) => ({
    '#': index + 1,
    Producto: product.name,
    'Unidades vendidas': product.quantity,
    'Ingresos ($)': product.revenue,
  }));
}

function buildPaymentRows(sales: Sale[]) {
  const byCount = getPaymentMethodStats(sales);
  const byRevenue = getPaymentMethodRevenueStats(sales);
  const revenueMap = new Map(byRevenue.map((item) => [item.label, item.value]));
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  return byCount.map((item, index) => ({
    '#': index + 1,
    'Medio de pago': item.label,
    'Cantidad de ventas': item.value,
    '% ventas': totalSales > 0 ? Math.round((item.value / totalSales) * 1000) / 10 : 0,
    'Ingresos ($)': revenueMap.get(item.label) ?? 0,
    '% ingresos':
      totalRevenue > 0
        ? Math.round(((revenueMap.get(item.label) ?? 0) / totalRevenue) * 1000) / 10
        : 0,
  }));
}

function buildSalesSummaryRows(sales: Sale[], month: Date) {
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const products = getTopProducts(sales, 500).sort((a, b) => b.quantity - a.quantity);
  const payments = getPaymentMethodStats(sales);
  const paymentRevenue = getPaymentMethodRevenueStats(sales);
  const bestProduct = products[0];
  const topPayment = payments[0];
  const topPaymentRevenue = paymentRevenue[0];
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  return [
    { Concepto: 'Período', Valor: monthLabel },
    { Concepto: 'Total de ventas', Valor: sales.length },
    { Concepto: 'Recaudación total ($)', Valor: totalRevenue },
    { Concepto: '', Valor: '' },
    { Concepto: 'Producto más vendido', Valor: bestProduct?.name ?? '-' },
    { Concepto: 'Unidades del más vendido', Valor: bestProduct?.quantity ?? 0 },
    { Concepto: 'Ingresos del más vendido ($)', Valor: bestProduct?.revenue ?? 0 },
    { Concepto: '', Valor: '' },
    { Concepto: 'Medio de pago más usado', Valor: topPayment?.label ?? '-' },
    { Concepto: 'Ventas con ese medio', Valor: topPayment?.value ?? 0 },
    { Concepto: 'Ingresos con ese medio ($)', Valor: topPaymentRevenue?.value ?? 0 },
  ];
}

function buildCajaRows(records: DailyCaja[]) {
  return records.map((record) => ({
    Fecha: formatShortDate(record.date),
    'Caja cambio': record.cajaCambio,
    'Caja total': record.cajaTotal,
    Ganancia: record.ganancia,
    'Total guardado': record.totalGuardado,
    'Cambio para mañana': record.cambioCierre,
    'Actualizado por': record.updatedByName ?? '',
  }));
}

function buildCajaSummaryRows(records: DailyCaja[], periodLabel: string) {
  const totalGanancia = records.reduce((sum, record) => sum + record.ganancia, 0);
  const totalCaja = records.reduce((sum, record) => sum + record.cajaTotal, 0);
  const totalGuardado = records.reduce((sum, record) => sum + record.totalGuardado, 0);

  return [
    { Concepto: 'Período', Valor: periodLabel },
    { Concepto: 'Cierres registrados', Valor: records.length },
    { Concepto: 'Ganancia total ($)', Valor: totalGanancia },
    { Concepto: 'Caja total acumulada ($)', Valor: totalCaja },
    { Concepto: 'Total guardado ($)', Valor: totalGuardado },
  ];
}

function appendSheet(workbook: XLSX.WorkBook, rows: Record<string, unknown>[], name: string) {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function saveWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, fileName);
}

export function printHtml(html: string) {
  const win = window.open('', '_blank');
  if (!win) throw new Error('No se pudo abrir la ventana de impresión');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 250);
}

export async function exportMonthSalesToExcel(
  sales: Sale[],
  month: Date = new Date()
): Promise<void> {
  const monthSales = getMonthSales(sales, month);
  if (monthSales.length === 0) {
    throw new Error('No hay ventas en este mes para exportar');
  }

  const fileName = `ventas-${format(month, 'yyyy-MM')}.xlsx`;
  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, buildSalesSummaryRows(monthSales, month), 'Resumen');
  appendSheet(workbook, buildSalesRows(monthSales), 'Ventas');
  appendSheet(workbook, buildProductRows(monthSales), 'Productos');
  appendSheet(workbook, buildPaymentRows(monthSales), 'Medios de pago');
  saveWorkbook(workbook, fileName);
}

export async function exportMonthCajaToExcel(
  records: DailyCaja[],
  month: Date = new Date()
): Promise<void> {
  const monthRecords = getMonthCaja(records, month);
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  await exportCajaRecordsToExcel(monthRecords, monthLabel, `caja-${format(month, 'yyyy-MM')}.xlsx`);
}

export async function exportCajaRecordsToExcel(
  records: DailyCaja[],
  periodLabel: string,
  fileName = `caja-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
): Promise<void> {
  if (records.length === 0) {
    throw new Error('No hay cierres de caja en este período para exportar');
  }

  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, buildCajaSummaryRows(records, periodLabel), 'Resumen');
  appendSheet(workbook, buildCajaRows(records), 'Cierres');
  saveWorkbook(workbook, fileName);
}

export function buildCajaPdfHtml(records: DailyCaja[], title: string): string {
  const totalGanancia = records.reduce((sum, record) => sum + record.ganancia, 0);
  const totalCaja = records.reduce((sum, record) => sum + record.cajaTotal, 0);
  const totalGuardado = records.reduce((sum, record) => sum + record.totalGuardado, 0);

  const rows = records
    .map(
      (record) => `
      <tr>
        <td>${formatShortDate(record.date)}</td>
        <td style="text-align:right">${formatCurrency(record.cajaCambio)}</td>
        <td style="text-align:right">${formatCurrency(record.cajaTotal)}</td>
        <td style="text-align:right">${formatCurrency(record.ganancia)}</td>
        <td style="text-align:right">${formatCurrency(record.totalGuardado)}</td>
        <td style="text-align:right">${formatCurrency(record.cambioCierre)}</td>
        <td>${record.updatedByName || '-'}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;color:#1A1A2E;padding:24px;margin:0}
  h1{font-size:20px;margin:0 0 8px}
  .meta{color:#6B7280;font-size:12px;margin-bottom:12px}
  .summary{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}
  .chip{background:#F8F9FC;border:1px solid #E8ECF4;border-radius:8px;padding:8px 12px;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #E8ECF4;padding:8px 4px;text-align:left}
  th{background:#F8F9FC}
</style></head><body>
  <h1>Advance Coat — ${title}</h1>
  <div class="meta">${records.length} cierres registrados</div>
  <div class="summary">
    <div class="chip"><strong>Ganancia:</strong> ${formatCurrency(totalGanancia)}</div>
    <div class="chip"><strong>Caja total:</strong> ${formatCurrency(totalCaja)}</div>
    <div class="chip"><strong>Guardado:</strong> ${formatCurrency(totalGuardado)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Cambio</th>
        <th>Caja</th>
        <th>Ganancia</th>
        <th>Guardado</th>
        <th>Cierre</th>
        <th>Por</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

export async function exportMonthCajaToPdf(
  records: DailyCaja[],
  month: Date = new Date()
): Promise<void> {
  const monthRecords = getMonthCaja(records, month);
  if (monthRecords.length === 0) {
    throw new Error('No hay cierres de caja en este mes para exportar');
  }
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  printHtml(buildCajaPdfHtml(monthRecords, `Caja ${monthLabel}`));
}

export async function exportCajaRecordsToPdf(
  records: DailyCaja[],
  periodLabel: string
): Promise<void> {
  if (records.length === 0) {
    throw new Error('No hay cierres de caja en este período para exportar');
  }
  printHtml(buildCajaPdfHtml(records, `Caja ${periodLabel}`));
}

export async function exportDaySalesToExcel(
  sales: Sale[],
  day: Date = new Date()
): Promise<void> {
  const daySales = getDaySales(sales, day);
  if (daySales.length === 0) {
    throw new Error('No hay ventas en este día para exportar');
  }

  const dayLabel = format(day, 'dd/MM/yyyy');
  const fileName = `ventas-${format(day, 'yyyy-MM-dd')}.xlsx`;
  const workbook = XLSX.utils.book_new();
  const totalRevenue = daySales.reduce((sum, sale) => sum + sale.total, 0);

  appendSheet(
    workbook,
    [
      { Concepto: 'Fecha', Valor: dayLabel },
      { Concepto: 'Total de ventas', Valor: daySales.length },
      { Concepto: 'Recaudación ($)', Valor: totalRevenue },
    ],
    'Resumen'
  );
  appendSheet(workbook, buildSalesRows(daySales), 'Ventas');
  appendSheet(workbook, buildProductRows(daySales), 'Productos');
  appendSheet(workbook, buildPaymentRows(daySales), 'Medios de pago');
  saveWorkbook(workbook, fileName);
}

export async function exportSalesReportText(
  sales: Sale[],
  label: string,
  fileSuffix?: string
): Promise<void> {
  if (sales.length === 0) {
    throw new Error('No hay ventas en este período para exportar');
  }

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const parts = [
    `ADVANCE COAT — Reporte ${label}`,
    `Ventas: ${sales.length}`,
    `Recaudación: $${totalRevenue.toFixed(2)}`,
    '============================',
    ...sales.map((sale) => buildSaleTicketText(sale)),
  ];
  const text = parts.join('\n\n');
  const fileName = `reporte-${fileSuffix ?? format(new Date(), 'yyyy-MM-dd')}.txt`;
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), fileName);
}

export function buildSalesPdfHtml(sales: Sale[], title: string): string {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const rows = sales
    .map(
      (sale) => `
      <tr>
        <td>${formatShortDate(sale.date)}</td>
        <td>${sale.customer?.name || '-'}</td>
        <td>${getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel)}</td>
        <td style="text-align:right">${formatCurrency(sale.total)}</td>
        <td>${sale.createdByName || '-'}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;color:#1A1A2E;padding:24px;margin:0}
  h1{font-size:20px;margin:0 0 8px}
  .meta{color:#6B7280;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #E8ECF4;padding:8px 4px;text-align:left}
  th{background:#F8F9FC}
</style></head><body>
  <h1>Advance Coat — ${title}</h1>
  <div class="meta">${sales.length} ventas · Recaudación ${formatCurrency(totalRevenue)}</div>
  <table>
    <thead><tr><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Total</th><th>Vendedor</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

export function buildCustomersPdfHtml(customers: Customer[]): string {
  const rows = customers
    .map(
      (customer) => `
      <tr>
        <td>${customer.name || '-'}</td>
        <td>${customer.email || '-'}</td>
        <td>${customer.phone || '-'}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Clientes</title>
<style>
  body{font-family:Arial,sans-serif;color:#1A1A2E;padding:24px;margin:0}
  h1{font-size:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border-bottom:1px solid #E8ECF4;padding:8px 4px;text-align:left}
  th{background:#F8F9FC}
</style></head><body>
  <h1>Advance Coat — Clientes</h1>
  <p>${customers.length} registros</p>
  <table>
    <thead><tr><th>Nombre</th><th>Email</th><th>Teléfono</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}

export async function exportMonthSalesToPdf(
  sales: Sale[],
  month: Date = new Date()
): Promise<void> {
  const monthSales = getMonthSales(sales, month);
  if (monthSales.length === 0) {
    throw new Error('No hay ventas en este mes para exportar');
  }
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  printHtml(buildSalesPdfHtml(monthSales, `Ventas ${monthLabel}`));
}

export async function exportDaySalesToPdf(
  sales: Sale[],
  day: Date = new Date()
): Promise<void> {
  const daySales = getDaySales(sales, day);
  if (daySales.length === 0) {
    throw new Error('No hay ventas en este día para exportar');
  }
  const dayLabel = format(day, 'dd/MM/yyyy');
  printHtml(buildSalesPdfHtml(daySales, `Ventas ${dayLabel}`));
}

export async function exportSalesInRangeToExcel(
  sales: Sale[],
  start: Date,
  end: Date,
  label: string
): Promise<void> {
  if (sales.length === 0) {
    throw new Error('No hay ventas en este período para exportar');
  }

  const fileName = `ventas-${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.xlsx`;
  const workbook = XLSX.utils.book_new();
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  appendSheet(
    workbook,
    [
      { Concepto: 'Período', Valor: label },
      { Concepto: 'Total de ventas', Valor: sales.length },
      { Concepto: 'Recaudación ($)', Valor: totalRevenue },
    ],
    'Resumen'
  );
  appendSheet(workbook, buildSalesRows(sales), 'Ventas');
  appendSheet(workbook, buildProductRows(sales), 'Productos');
  appendSheet(workbook, buildPaymentRows(sales), 'Medios de pago');
  saveWorkbook(workbook, fileName);
}

export async function exportSalesInRangeToPdf(sales: Sale[], label: string): Promise<void> {
  if (sales.length === 0) {
    throw new Error('No hay ventas en este período para exportar');
  }
  printHtml(buildSalesPdfHtml(sales, `Ventas ${label}`));
}

export async function exportCustomersToExcel(customers: Customer[]): Promise<void> {
  if (customers.length === 0) {
    throw new Error('No hay clientes para exportar');
  }

  const rows = customers.map((customer) => ({
    Nombre: customer.name,
    Email: customer.email,
    Teléfono: customer.phone,
    Alta: customer.createdAt ? formatShortDate(customer.createdAt) : '',
  }));

  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, rows, 'Clientes');
  saveWorkbook(workbook, `clientes-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export async function exportCustomersToPdf(customers: Customer[]): Promise<void> {
  if (customers.length === 0) {
    throw new Error('No hay clientes para exportar');
  }
  printHtml(buildCustomersPdfHtml(customers));
}
