import type { Sale, SaleItem } from '../types/index';
import {
  RESIN_REF_150G,
  RESIN_REF_300G,
  RESIN_REF_750G,
  DR_REF_PRICE,
  BEL_REF_PRICE,
  RESIN_UNIT_LABELS,
  RESIN_PRODUCTS_150G,
  RESIN_PRODUCTS_300G,
  RESIN_PRODUCTS_450G,
  RESIN_PRODUCTS_750G,
  RESIN_PRODUCTS_1KG,
  RESIN_PRODUCTS_1_5KG,
  RESIN_PRODUCTS_3KG,
  RESIN_PRODUCTS_6KG,
  CATALYST_PRODUCTS,
  COMBOS_150G,
  COMBOS_300G_SIMPLE,
  COMBO_LETRAS_GRANDES,
  COMBO_OLAS_MARES,
  COMBO_PIGMENTOS_TRANSLUCIDOS,
  PACK_6_CONCENTRADOS,
  DR_NAME_PATTERN,
  BEL_NAME_PATTERN,
  type ResinUnitKey,
} from '../constants/resinAccounting';
import { formatCurrency } from './format';

export type { ResinUnitKey };

export interface ResinUnitCounts {
  '150g': number;
  '300g': number;
  '750g': number;
  '1.5kg': number;
  '3kg': number;
  catalizador: number;
  dr: number;
  bel: number;
}

export interface ResinAccountingTotals {
  units: ResinUnitCounts;
  resinMoney: number;
  extrasMoney: number;
}

const EMPTY_UNITS = (): ResinUnitCounts => ({
  '150g': 0,
  '300g': 0,
  '750g': 0,
  '1.5kg': 0,
  '3kg': 0,
  catalizador: 0,
  dr: 0,
  bel: 0,
});

const NAME_LISTS: { names: string[]; key: string }[] = [
  { names: RESIN_PRODUCTS_150G, key: '150g' },
  { names: RESIN_PRODUCTS_300G, key: '300g' },
  { names: RESIN_PRODUCTS_450G, key: '450g' },
  { names: RESIN_PRODUCTS_750G, key: '750g' },
  { names: RESIN_PRODUCTS_1KG, key: '1kg' },
  { names: RESIN_PRODUCTS_1_5KG, key: '1.5kg' },
  { names: RESIN_PRODUCTS_3KG, key: '3kg' },
  { names: RESIN_PRODUCTS_6KG, key: '6kg' },
  { names: CATALYST_PRODUCTS, key: 'catalizador' },
  { names: COMBOS_150G, key: 'combo150' },
  { names: COMBOS_300G_SIMPLE, key: 'combo300' },
  { names: [COMBO_LETRAS_GRANDES], key: 'comboLetras' },
  { names: [COMBO_OLAS_MARES], key: 'comboOlas' },
  { names: [COMBO_PIGMENTOS_TRANSLUCIDOS], key: 'comboPigmentos' },
  { names: [PACK_6_CONCENTRADOS], key: 'pack6' },
];

export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  return normalizeProductName(a) === normalizeProductName(b);
}

function findListKey(productName: string): string | null {
  for (const { names, key } of NAME_LISTS) {
    if (names.some((n) => namesMatch(n, productName))) return key;
  }
  return null;
}

function isDrProduct(productName: string): boolean {
  const n = normalizeProductName(productName);
  if (namesMatch(productName, COMBO_PIGMENTOS_TRANSLUCIDOS)) return true;
  return n.includes(DR_NAME_PATTERN);
}

function isBelProduct(productName: string): boolean {
  const n = normalizeProductName(productName);
  if (namesMatch(productName, PACK_6_CONCENTRADOS)) return true;
  return n.includes(BEL_NAME_PATTERN);
}

interface MoneySplit {
  resinMoney: number;
  extrasMoney: number;
}

interface UnitDelta {
  units: Partial<ResinUnitCounts>;
  money: MoneySplit;
}

function emptyMoney(): MoneySplit {
  return { resinMoney: 0, extrasMoney: 0 };
}

function scaleMoney(m: MoneySplit, factor: number): MoneySplit {
  return { resinMoney: m.resinMoney * factor, extrasMoney: m.extrasMoney * factor };
}

function allocateProportional(
  amount: number,
  components: { weight: number; resin: boolean; unit?: ResinUnitKey; unitCount?: number }[]
): UnitDelta {
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  if (totalWeight <= 0 || amount <= 0) {
    return { units: {}, money: emptyMoney() };
  }

  const units: Partial<ResinUnitCounts> = {};
  let resinMoney = 0;
  let extrasMoney = 0;

  for (const comp of components) {
    const share = (amount * comp.weight) / totalWeight;
    if (comp.resin) resinMoney += share;
    else extrasMoney += share;
    if (comp.unit && comp.unitCount) {
      units[comp.unit] = (units[comp.unit] ?? 0) + comp.unitCount;
    }
  }

  return { units, money: { resinMoney, extrasMoney } };
}

function saleDiscountFactor(sale: Sale): number {
  const subtotal = sale.subtotal ?? sale.items.reduce((s, i) => s + i.subtotal, 0);
  if (subtotal <= 0) return 1;
  return sale.total / subtotal;
}

function scaleUnits(units: Partial<ResinUnitCounts>, factor: number): Partial<ResinUnitCounts> {
  const out: Partial<ResinUnitCounts> = {};
  for (const [k, v] of Object.entries(units) as [ResinUnitKey, number][]) {
    out[k] = v * factor;
  }
  return out;
}

function mergeUnits(target: ResinUnitCounts, delta: Partial<ResinUnitCounts>): void {
  for (const [k, v] of Object.entries(delta) as [ResinUnitKey, number][]) {
    target[k] += v;
  }
}

function allocateLineItem(item: SaleItem, catalogPrice?: number): UnitDelta {
  const qty = item.quantity;
  const lineSubtotal = item.subtotal;
  const key = findListKey(item.productName);

  if (key === '150g') {
    return { units: { '150g': qty }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === '300g') {
    return { units: { '300g': qty }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === '750g') {
    return { units: { '750g': qty }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === '1.5kg') {
    return { units: { '1.5kg': qty }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === '3kg') {
    return { units: { '3kg': qty }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === '6kg') {
    return { units: { '3kg': qty * 2 }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === '450g') {
    const perUnit = allocateProportional(lineSubtotal / qty, [
      { weight: RESIN_REF_150G, resin: true, unit: '150g', unitCount: 1 },
      { weight: RESIN_REF_300G, resin: true, unit: '300g', unitCount: 1 },
    ]);
    return {
      units: scaleUnits(perUnit.units, qty),
      money: { resinMoney: lineSubtotal, extrasMoney: 0 },
    };
  }
  if (key === '1kg') {
    const perUnit = allocateProportional(lineSubtotal / qty, [
      { weight: RESIN_REF_300G, resin: true, unit: '300g', unitCount: 1 },
      { weight: RESIN_REF_750G, resin: true, unit: '750g', unitCount: 1 },
    ]);
    return {
      units: scaleUnits(perUnit.units, qty),
      money: { resinMoney: lineSubtotal, extrasMoney: 0 },
    };
  }
  if (key === 'catalizador') {
    return { units: { catalizador: qty }, money: { resinMoney: lineSubtotal, extrasMoney: 0 } };
  }
  if (key === 'combo150') {
    const refTotal = catalogPrice && catalogPrice > RESIN_REF_150G ? catalogPrice : RESIN_REF_150G;
    const perUnit = allocateProportional(lineSubtotal / qty, [
      { weight: RESIN_REF_150G, resin: true, unit: '150g', unitCount: 1 },
      { weight: Math.max(0, refTotal - RESIN_REF_150G), resin: false },
    ]);
    return {
      units: scaleUnits(perUnit.units, qty),
      money: scaleMoney(perUnit.money, qty),
    };
  }
  if (key === 'combo300') {
    const refTotal = catalogPrice && catalogPrice > RESIN_REF_300G ? catalogPrice : RESIN_REF_300G;
    const perUnit = allocateProportional(lineSubtotal / qty, [
      { weight: RESIN_REF_300G, resin: true, unit: '300g', unitCount: 1 },
      { weight: Math.max(0, refTotal - RESIN_REF_300G), resin: false },
    ]);
    return {
      units: scaleUnits(perUnit.units, qty),
      money: scaleMoney(perUnit.money, qty),
    };
  }
  if (key === 'comboLetras') {
    const baseRef = RESIN_REF_300G + 5 * DR_REF_PRICE;
    const refTotal = catalogPrice && catalogPrice > baseRef ? catalogPrice : baseRef;
    const components: {
      weight: number;
      resin: boolean;
      unit?: ResinUnitKey;
      unitCount?: number;
    }[] = [
      { weight: RESIN_REF_300G, resin: true, unit: '300g', unitCount: 1 },
      { weight: 5 * DR_REF_PRICE, resin: false, unit: 'dr', unitCount: 5 },
    ];
    if (refTotal > baseRef) {
      components.push({ weight: refTotal - baseRef, resin: false });
    }
    const perUnit = allocateProportional(lineSubtotal / qty, components);
    return {
      units: scaleUnits(perUnit.units, qty),
      money: scaleMoney(perUnit.money, qty),
    };
  }
  if (key === 'comboOlas') {
    const baseRef = RESIN_REF_300G + 2 * DR_REF_PRICE + BEL_REF_PRICE;
    const refTotal = catalogPrice && catalogPrice > baseRef ? catalogPrice : baseRef;
    const components: {
      weight: number;
      resin: boolean;
      unit?: ResinUnitKey;
      unitCount?: number;
    }[] = [
      { weight: RESIN_REF_300G, resin: true, unit: '300g', unitCount: 1 },
      { weight: 2 * DR_REF_PRICE, resin: false, unit: 'dr', unitCount: 2 },
      { weight: BEL_REF_PRICE, resin: false, unit: 'bel', unitCount: 1 },
    ];
    if (refTotal > baseRef) {
      components.push({ weight: refTotal - baseRef, resin: false });
    }
    const perUnit = allocateProportional(lineSubtotal / qty, components);
    return {
      units: scaleUnits(perUnit.units, qty),
      money: scaleMoney(perUnit.money, qty),
    };
  }
  if (key === 'comboPigmentos') {
    return {
      units: { dr: qty * 8 },
      money: { resinMoney: 0, extrasMoney: lineSubtotal },
    };
  }
  if (key === 'pack6') {
    return {
      units: { bel: qty * 6 },
      money: { resinMoney: 0, extrasMoney: lineSubtotal },
    };
  }

  if (isDrProduct(item.productName)) {
    return { units: { dr: qty }, money: { resinMoney: 0, extrasMoney: lineSubtotal } };
  }
  if (isBelProduct(item.productName)) {
    return { units: { bel: qty }, money: { resinMoney: 0, extrasMoney: lineSubtotal } };
  }

  return { units: {}, money: { resinMoney: 0, extrasMoney: lineSubtotal } };
}

export interface ResinAccountingOptions {
  catalogPrices?: Map<string, number>;
}

export function computeResinAccounting(
  sales: Sale[],
  options: ResinAccountingOptions = {}
): ResinAccountingTotals {
  const totals: ResinAccountingTotals = {
    units: EMPTY_UNITS(),
    resinMoney: 0,
    extrasMoney: 0,
  };

  for (const sale of sales) {
    const discountFactor = saleDiscountFactor(sale);

    for (const item of sale.items) {
      const catalogPrice = options.catalogPrices?.get(normalizeProductName(item.productName));
      const delta = allocateLineItem(item, catalogPrice);
      const money = scaleMoney(delta.money, discountFactor);
      totals.resinMoney += money.resinMoney;
      totals.extrasMoney += money.extrasMoney;
      mergeUnits(totals.units, delta.units);
    }
  }

  return totals;
}

export interface SaleResinMoney {
  resinMoney: number;
  extrasMoney: number;
}

export function computeSaleResinMoney(
  sale: Sale,
  options: ResinAccountingOptions = {}
): SaleResinMoney {
  const discountFactor = saleDiscountFactor(sale);
  let resinMoney = 0;
  let extrasMoney = 0;

  for (const item of sale.items ?? []) {
    const catalogPrice = options.catalogPrices?.get(normalizeProductName(item.productName));
    const delta = allocateLineItem(item, catalogPrice);
    const money = scaleMoney(delta.money, discountFactor);
    resinMoney += money.resinMoney;
    extrasMoney += money.extrasMoney;
  }

  return { resinMoney, extrasMoney };
}

export interface ResinAccountingExcelRow {
  Concepto: string;
  Unidades: number | string;
  'Plata resina': number | string;
  'Plata extras': number | string;
}

export function buildResinAccountingExcelRows(totals: ResinAccountingTotals): ResinAccountingExcelRow[] {
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

  const rows: ResinAccountingExcelRow[] = [
    {
      Concepto: '— Unidades vendidas —',
      Unidades: '',
      'Plata resina': '',
      'Plata extras': '',
    },
  ];

  for (const key of unitKeys) {
    rows.push({
      Concepto: RESIN_UNIT_LABELS[key],
      Unidades: totals.units[key],
      'Plata resina': '',
      'Plata extras': '',
    });
  }

  rows.push(
    { Concepto: '', Unidades: '', 'Plata resina': '', 'Plata extras': '' },
    {
      Concepto: '— Totales de plata —',
      Unidades: '',
      'Plata resina': '',
      'Plata extras': '',
    },
    {
      Concepto: 'Recibido resina (incl. catalizadores)',
      Unidades: '',
      'Plata resina': totals.resinMoney,
      'Plata extras': '',
    },
    {
      Concepto: 'Plata de extras (DR, BEL y resto)',
      Unidades: '',
      'Plata resina': '',
      'Plata extras': totals.extrasMoney,
    },
    {
      Concepto: 'TOTAL',
      Unidades: '',
      'Plata resina': totals.resinMoney + totals.extrasMoney,
      'Plata extras': '',
    }
  );

  return rows;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildResinAccountingHtml(totals: ResinAccountingTotals, periodLabel?: string): string {
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

  const periodMeta = periodLabel ? ` · ${escapeHtml(periodLabel)}` : '';
  const grandTotal = totals.resinMoney + totals.extrasMoney;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;color:#1A1A2E;padding:24px;margin:0}
  h1{font-size:20px;margin:0 0 4px}
  h2{font-size:15px;margin:20px 0 8px}
  .meta{color:#6B7280;font-size:12px;margin-bottom:16px}
  table{width:100%;max-width:520px;border-collapse:collapse;font-size:12px;margin-bottom:12px}
  th,td{border-bottom:1px solid #E8ECF4;padding:8px 6px;text-align:left}
  th{background:#F8F9FC}
  td.num{text-align:right}
  .money-row td{font-weight:600}
  .total-row td{font-weight:700;background:#F8F9FC}
</style></head><body>
  <h1>Contabilización resina</h1>
  <div class="meta">${periodMeta}</div>
  <h2>Unidades vendidas</h2>
  <table>
    <thead><tr><th>Presentación</th><th class="num">Unidades</th></tr></thead>
    <tbody>${unitRows}</tbody>
  </table>
  <h2>Plata</h2>
  <table>
    <tbody>
      <tr class="money-row">
        <td>Recibido resina (incl. catalizadores)</td>
        <td class="num">${formatCurrency(totals.resinMoney)}</td>
      </tr>
      <tr class="money-row">
        <td>Plata de extras (DR, BEL y resto)</td>
        <td class="num">${formatCurrency(totals.extrasMoney)}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="num">${formatCurrency(grandTotal)}</td>
      </tr>
    </tbody>
  </table>
</body></html>`;
}

export function buildResinAccountingCatalogMap(
  products: { name: string; price: number }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of products) {
    map.set(normalizeProductName(p.name), p.price);
  }
  return map;
}
