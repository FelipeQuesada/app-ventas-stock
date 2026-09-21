import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FLEX_ZONE_IDS,
  FLEX_ZONE_LABELS,
  FLEX_ZONE_PRICES,
} from '../constants/flex';
import { formatCurrency } from './format';
import {
  buildFlexMonthRows,
  getFlexLocalityStats,
  getFlexZoneStats,
  summarizeFlexMonth,
  type FlexShipment,
} from './flex';

const COL = {
  caba: '#D6EAF8',
  zona1: '#FAD7A0',
  zona2: '#F9E79F',
  zona3: '#F5B041',
  pedidos: '#D4E6F1',
  recaudado: '#D5F5E3',
  header: '#1F4E79',
};

export function buildFlexMonthPdfHtml(month: Date, shipments: FlexShipment[]): string {
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const rows = buildFlexMonthRows(month, shipments);
  const summary = summarizeFlexMonth(rows);
  const zoneStats = getFlexZoneStats(shipments);
  const localityStats = getFlexLocalityStats(shipments, 15);
  const title = `Control Flex — ${monthLabel}`;

  const dayRows = rows
    .map((row) => {
      const empty = row.totalPedidos === 0;
      return `
      <tr class="${empty ? 'empty' : ''}">
        <td class="date">${row.day}</td>
        <td class="caba">${row.counts.caba}</td>
        <td class="z1">${row.counts.zona1}</td>
        <td class="z2">${row.counts.zona2}</td>
        <td class="z3">${row.counts.zona3}</td>
        <td class="pedidos">${row.totalPedidos}</td>
        <td class="money">${formatCurrency(row.totalRecaudado)}</td>
      </tr>`;
    })
    .join('');

  const zoneChips = FLEX_ZONE_IDS.map(
    (zone) => `
      <div class="chip">
        <span>${FLEX_ZONE_LABELS[zone]}</span>
        <strong>${summary.counts[zone]}</strong>
        <em>${formatCurrency(summary.counts[zone] * FLEX_ZONE_PRICES[zone])}</em>
      </div>`
  ).join('');

  const topZones = zoneStats
    .filter((z) => z.quantity > 0)
    .map(
      (z) =>
        `<tr><td>${z.zoneLabel}</td><td>${z.quantity}</td><td class="money">${formatCurrency(z.revenue)}</td></tr>`
    )
    .join('');

  const topLocalities = localityStats
    .map(
      (s) =>
        `<tr><td>${s.locality} <span class="muted">(${s.zoneLabel})</span></td><td>${s.quantity}</td><td class="money">${formatCurrency(s.revenue)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;color:#1A1A2E;padding:24px;margin:0;background:#fff}
  h1{font-size:20px;margin:0 0 4px;color:${COL.header}}
  h2{font-size:14px;margin:20px 0 8px;color:${COL.header}}
  .meta{color:#6B7280;font-size:12px;margin-bottom:14px;text-transform:capitalize}
  .summary{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
  .chip{background:#F8F9FC;border:1px solid #E8ECF4;border-radius:10px;padding:8px 12px;min-width:110px}
  .chip span{display:block;font-size:11px;color:#6B7280}
  .chip strong{display:block;font-size:18px;margin-top:2px}
  .chip em{display:block;font-size:11px;color:#6B7280;font-style:normal;margin-top:2px}
  .totals{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;font-size:13px}
  .totals strong{font-size:16px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px}
  th,td{border:1px solid #E8ECF4;padding:6px 5px;text-align:center}
  th{color:#1F4E79;font-size:10px;text-transform:uppercase;letter-spacing:.02em}
  th.date,td.date{text-align:left;font-weight:600;background:#F1F5F9;min-width:40px}
  th.caba{background:${COL.caba}}
  th.z1{background:${COL.zona1}}
  th.z2{background:${COL.zona2}}
  th.z3{background:${COL.zona3}}
  th.pedidos{background:${COL.pedidos}}
  th.recaudado{background:${COL.recaudado}}
  td.caba{background:#EAF4FB}
  td.z1{background:#FEF6EB}
  td.z2{background:#FEFCE8}
  td.z3{background:#FFF4E6}
  td.pedidos{background:#EEF5FA}
  td.money{background:#EEFAF3;text-align:right;white-space:nowrap}
  tr.empty td{opacity:.55;color:#6B7280}
  tfoot td{font-weight:700;border-top:2px solid #1F4E79}
  tfoot .date{background:#DBE4EE}
  tfoot .caba{background:#C5E1F5}
  tfoot .z1{background:#F5C987}
  tfoot .z2{background:#F5E06A}
  tfoot .z3{background:#F0A020;color:#3D2200}
  tfoot .pedidos{background:#B8D4E8}
  tfoot .money{background:#A9E8C5}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .muted{color:#6B7280;font-size:10px}
  .side td{text-align:left}
  .side td:nth-child(2),.side td:nth-child(3){text-align:right}
  @media print{
    body{padding:12px}
    .grid{break-inside:avoid}
  }
  @media (max-width:640px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
  <h1>Advance Coat — Control mensual Flex</h1>
  <div class="meta">${monthLabel}</div>
  <div class="summary">${zoneChips}</div>
  <div class="totals">
    <div>Total pedidos: <strong>${summary.totalPedidos}</strong></div>
    <div>Total recaudado: <strong>${formatCurrency(summary.totalRecaudado)}</strong></div>
  </div>

  <h2>Control diario</h2>
  <table>
    <thead>
      <tr>
        <th class="date">Fecha</th>
        <th class="caba">CABA</th>
        <th class="z1">Zona 1</th>
        <th class="z2">Zona 2</th>
        <th class="z3">Zona 3</th>
        <th class="pedidos">Total pedidos</th>
        <th class="recaudado">Total recaudado</th>
      </tr>
    </thead>
    <tbody>${dayRows}</tbody>
    <tfoot>
      <tr>
        <td class="date">Total mes</td>
        <td class="caba">${summary.counts.caba}</td>
        <td class="z1">${summary.counts.zona1}</td>
        <td class="z2">${summary.counts.zona2}</td>
        <td class="z3">${summary.counts.zona3}</td>
        <td class="pedidos">${summary.totalPedidos}</td>
        <td class="money">${formatCurrency(summary.totalRecaudado)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="grid">
    <div>
      <h2>Zonas</h2>
      <table class="side">
        <thead><tr><th>Zona</th><th>Pedidos</th><th>Recaudado</th></tr></thead>
        <tbody>${topZones || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <h2>Localidades top</h2>
      <table class="side">
        <thead><tr><th>Localidad</th><th>Pedidos</th><th>Recaudado</th></tr></thead>
        <tbody>${topLocalities || '<tr><td colspan="3" class="muted">Sin datos</td></tr>'}</tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
