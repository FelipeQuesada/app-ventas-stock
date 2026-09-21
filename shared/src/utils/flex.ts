import {
  FLEX_ZONE_IDS,
  FLEX_ZONE_LABELS,
  FLEX_ZONE_PRICES,
  type FlexZoneId,
} from '../constants/flex';

export interface FlexShipment {
  id: string;
  date: Date;
  dateId: string;
  zone: FlexZoneId;
  locality: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

export type FlexZoneCounts = Record<FlexZoneId, number>;

export interface FlexDayRow {
  day: number;
  dateId: string;
  date: Date;
  counts: FlexZoneCounts;
  totalPedidos: number;
  totalRecaudado: number;
}

export interface FlexMonthSummary {
  counts: FlexZoneCounts;
  totalPedidos: number;
  totalRecaudado: number;
}

export interface FlexLocalityStat {
  locality: string;
  zone: FlexZoneId;
  zoneLabel: string;
  quantity: number;
  revenue: number;
}

export function emptyZoneCounts(): FlexZoneCounts {
  return { caba: 0, zona1: 0, zona2: 0, zona3: 0 };
}

export function calcFlexLineTotal(zone: FlexZoneId, quantity: number): number {
  return FLEX_ZONE_PRICES[zone] * Math.max(0, quantity);
}

export function dateToFlexId(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Filas 1..díasDelMes para el control mensual (ceros si no hay envíos). */
export function buildFlexMonthRows(
  month: Date,
  shipments: FlexShipment[]
): FlexDayRow[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const byDay = new Map<string, FlexZoneCounts>();

  for (const shipment of shipments) {
    const id = shipment.dateId || dateToFlexId(shipment.date);
    const counts = byDay.get(id) ?? emptyZoneCounts();
    counts[shipment.zone] += shipment.quantity;
    byDay.set(id, counts);
  }

  const rows: FlexDayRow[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    const dateId = dateToFlexId(date);
    const counts = byDay.get(dateId) ?? emptyZoneCounts();
    let totalPedidos = 0;
    let totalRecaudado = 0;
    for (const zone of FLEX_ZONE_IDS) {
      totalPedidos += counts[zone];
      totalRecaudado += counts[zone] * FLEX_ZONE_PRICES[zone];
    }
    rows.push({ day, dateId, date, counts, totalPedidos, totalRecaudado });
  }
  return rows;
}

export function summarizeFlexMonth(rows: FlexDayRow[]): FlexMonthSummary {
  const counts = emptyZoneCounts();
  let totalPedidos = 0;
  let totalRecaudado = 0;
  for (const row of rows) {
    for (const zone of FLEX_ZONE_IDS) {
      counts[zone] += row.counts[zone];
    }
    totalPedidos += row.totalPedidos;
    totalRecaudado += row.totalRecaudado;
  }
  return { counts, totalPedidos, totalRecaudado };
}

export function getFlexLocalityStats(
  shipments: FlexShipment[],
  limit = 15
): FlexLocalityStat[] {
  const map = new Map<string, FlexLocalityStat>();
  for (const shipment of shipments) {
    const key = `${shipment.zone}::${shipment.locality}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += shipment.quantity;
      existing.revenue += shipment.total;
    } else {
      map.set(key, {
        locality: shipment.locality,
        zone: shipment.zone,
        zoneLabel: FLEX_ZONE_LABELS[shipment.zone],
        quantity: shipment.quantity,
        revenue: shipment.total,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit);
}

export function getFlexZoneStats(shipments: FlexShipment[]): FlexLocalityStat[] {
  const counts = emptyZoneCounts();
  for (const shipment of shipments) {
    counts[shipment.zone] += shipment.quantity;
  }
  return FLEX_ZONE_IDS.map((zone) => ({
    locality: FLEX_ZONE_LABELS[zone],
    zone,
    zoneLabel: FLEX_ZONE_LABELS[zone],
    quantity: counts[zone],
    revenue: counts[zone] * FLEX_ZONE_PRICES[zone],
  })).sort((a, b) => b.quantity - a.quantity);
}
