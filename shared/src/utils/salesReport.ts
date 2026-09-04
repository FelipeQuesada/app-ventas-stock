import type { Sale } from '../types/index';
import { getPaymentMethodLabel, getSalePaymentLabel } from '../constants/payments';
import { formatCurrency, formatShortDateTime, getSaleDisplayDate } from './format';
import { RESIN_UNIT_LABELS, type ResinUnitKey } from '../constants/resinAccounting';
import { type ResinAccountingTotals } from './resinAccounting';

export function formatSaleOperationDescription(sale: Sale): string {
  return (sale.items ?? [])
    .map((item) => `${item.productName} x${item.quantity}`)
    .join('; ');
}

export interface SalesHistoryReportRow {
  'Fecha de compra': string;
  'Descripción de operación': string;
  'Forma de pago': string;
  'Plata ingresada': number;
}

export function buildSalesHistoryReportRows(sales: Sale[]): SalesHistoryReportRow[] {
  return sales.map((sale) => ({
    'Fecha de compra': formatShortDateTime(getSaleDisplayDate(sale)),
    'Descripción de operación': formatSaleOperationDescription(sale),
    'Forma de pago': getSalePaymentLabel(sale),
    'Plata ingresada': sale.total,
  }));
}

export interface SalesHistoryPaymentSummaryRow {
  'Forma de pago': string;
  'Plata ingresada': number;
}

export function buildSalesHistoryPaymentSummary(sales: Sale[]): SalesHistoryPaymentSummaryRow[] {
  const map = new Map<string, number>();

  for (const sale of sales) {
    if (sale.paymentSplits?.length) {
      for (const split of sale.paymentSplits) {
        const label = split.paymentMethodLabel ?? getPaymentMethodLabel(split.method);
        map.set(label, (map.get(label) ?? 0) + split.amount);
      }
      continue;
    }
    const label = getSalePaymentLabel(sale);
    map.set(label, (map.get(label) ?? 0) + sale.total);
  }

  const rows = Array.from(map.entries())
    .map(([label, amount]) => ({
      'Forma de pago': label,
      'Plata ingresada': amount,
    }))
    .sort((a, b) => b['Plata ingresada'] - a['Plata ingresada']);

  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  rows.push({ 'Forma de pago': 'TOTAL', 'Plata ingresada': total });

  return rows;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSalesHistoryReportHtml(
  sales: Sale[],
  title: string,
  periodLabel?: string,
  resinTotals?: ResinAccountingTotals
): string {
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const paymentSummary = buildSalesHistoryPaymentSummary(sales);

  const saleRows = sales
    .map(
      (sale) => `
      <tr>
        <td>${escapeHtml(formatShortDateTime(getSaleDisplayDate(sale)))}</td>
        <td class="desc">${escapeHtml(formatSaleOperationDescription(sale))}</td>
        <td>${escapeHtml(getSalePaymentLabel(sale))}</td>
        <td class="num">${formatCurrency(sale.total)}</td>
      </tr>`
    )
    .join('');

  const paymentRows = paymentSummary
    .map((row) => {
      const isTotal = row['Forma de pago'] === 'TOTAL';
      return `
      <tr class="${isTotal ? 'total-row' : ''}">
        <td>${escapeHtml(row['Forma de pago'])}</td>
        <td class="num">${formatCurrency(row['Plata ingresada'])}</td>
      </tr>`;
    })
    .join('');

  const periodMeta = periodLabel ? ` · ${escapeHtml(periodLabel)}` : '';

  const resinSection = resinTotals ? buildResinSectionHtml(resinTotals) : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>
  body{font-family:Arial,sans-serif;color:#1A1A2E;padding:24px;margin:0}
  h1{font-size:20px;margin:0 0 4px}
  h2{font-size:15px;margin:28px 0 10px}
  .meta{color:#6B7280;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px}
  th,td{border-bottom:1px solid #E8ECF4;padding:8px 6px;text-align:left;vertical-align:top}
  th{background:#F8F9FC;font-weight:600}
  td.desc{max-width:320px;word-wrap:break-word}
  td.num{text-align:right;white-space:nowrap}
  th.num{text-align:right}
  .total-row td{font-weight:700;background:#F8F9FC}
  .summary-table{max-width:420px}
</style></head><body>
  <h1>Advance Coat — ${escapeHtml(title)}</h1>
  <div class="meta">${sales.length} ventas · Recaudación ${formatCurrency(totalRevenue)}${periodMeta}</div>
  <table>
    <thead>
      <tr>
        <th>Fecha de compra</th>
        <th>Descripción de operación</th>
        <th>Forma de pago</th>
        <th class="num">Plata ingresada</th>
      </tr>
    </thead>
    <tbody>${saleRows}</tbody>
  </table>
  <h2>Totales por forma de pago</h2>
  <table class="summary-table">
    <thead>
      <tr>
        <th>Forma de pago</th>
        <th class="num">Plata ingresada</th>
      </tr>
    </thead>
    <tbody>${paymentRows}</tbody>
  </table>
  ${resinSection}
</body></html>`;
}

function buildResinSectionHtml(totals: ResinAccountingTotals): string {
  const unitKeys: ResinUnitKey[] = [
    '150g',
    '300g',
    '750g',
    '1.5kg',
    '3kg',
    'catalizador',
    'dr',
    'bel',
  ];

  const unitRows = unitKeys
    .map(
      (key) => `
      <tr>
        <td>${escapeHtml(RESIN_UNIT_LABELS[key])}</td>
        <td class="num">${totals.units[key]}</td>
      </tr>`
    )
    .join('');

  const grandTotal = totals.resinMoney + totals.extrasMoney;

  return `
  <h2>Contabilización resina</h2>
  <h3 style="font-size:13px;margin:16px 0 8px">Unidades vendidas</h3>
  <table class="summary-table">
    <thead><tr><th>Presentación</th><th class="num">Unidades</th></tr></thead>
    <tbody>${unitRows}</tbody>
  </table>
  <h3 style="font-size:13px;margin:16px 0 8px">Plata</h3>
  <table class="summary-table">
    <tbody>
      <tr>
        <td>Recibido resina (incl. catalizadores)</td>
        <td class="num">${formatCurrency(totals.resinMoney)}</td>
      </tr>
      <tr>
        <td>Plata de extras (DR, BEL y resto)</td>
        <td class="num">${formatCurrency(totals.extrasMoney)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="num">${formatCurrency(grandTotal)}</td>
      </tr>
    </tbody>
  </table>`;
}
