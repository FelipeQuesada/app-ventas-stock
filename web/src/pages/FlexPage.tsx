import { useEffect, useMemo, useState } from 'react';
import { Download, Package, Plus, Trash2, Truck, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FLEX_ALL_LOCALITIES,
  FLEX_ZONE_IDS,
  FLEX_ZONE_LABELS,
  FLEX_ZONE_PRICES,
  buildFlexMonthRows,
  calcFlexLineTotal,
  findZoneForLocality,
  formatCurrency,
  getFlexLocalityStats,
  getFlexZoneStats,
  summarizeFlexMonth,
  type FlexShipment,
  type FlexZoneId,
} from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { addFlexShipment, deleteFlexShipment, getFlexShipmentsByMonth } from '../services/flex';
import { exportFlexMonthToExcel } from '../services/export';

function monthInputValue(date: Date): string {
  return format(date, 'yyyy-MM');
}

function parseMonthInput(value: string): Date {
  const [y, m] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

export function FlexPage() {
  const { user, profile } = useAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [shipments, setShipments] = useState<FlexShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [entryDate, setEntryDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [locality, setLocality] = useState('CABA');
  const [quantity, setQuantity] = useState('1');

  const zone: FlexZoneId | null = findZoneForLocality(locality);
  const unitPrice = zone ? FLEX_ZONE_PRICES[zone] : 0;
  const previewTotal = zone ? calcFlexLineTotal(zone, Math.max(1, Number(quantity) || 0)) : 0;

  async function load() {
    setLoading(true);
    try {
      setShipments(await getFlexShipmentsByMonth(month));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [month]);

  const rows = useMemo(() => buildFlexMonthRows(month, shipments), [month, shipments]);
  const summary = useMemo(() => summarizeFlexMonth(rows), [rows]);
  const localityStats = useMemo(() => getFlexLocalityStats(shipments, 12), [shipments]);
  const zoneStats = useMemo(() => getFlexZoneStats(shipments), [shipments]);
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const qty = Math.floor(Number(quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      window.alert('Ingresá una cantidad válida');
      return;
    }
    if (!locality.trim() || !zone) {
      window.alert('Seleccioná un lugar válido');
      return;
    }
    const [y, m, d] = entryDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    setSaving(true);
    try {
      await addFlexShipment({
        date,
        zone,
        locality,
        quantity: qty,
        createdBy: user.uid,
        createdByName: profile?.name,
      });
      setQuantity('1');
      const entryMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      if (
        entryMonth.getFullYear() !== month.getFullYear() ||
        entryMonth.getMonth() !== month.getMonth()
      ) {
        setMonth(entryMonth);
      } else {
        await load();
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este registro Flex?')) return;
    try {
      await deleteFlexShipment(id);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportFlexMonthToExcel(month, shipments);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  const recent = [...shipments].reverse().slice(0, 20);

  return (
    <div>
      <div className="page-header row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={22} /> Flex
          </h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Control de paquetes por zona · {monthLabel}
          </p>
        </div>
        <div className="actions flex-header-actions">
          <div className="flex-month-control">
            <button
              type="button"
              className="flex-month-nav"
              aria-label="Mes anterior"
              onClick={() => setMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="flex-month-display">
              <span className="flex-month-icon" aria-hidden>
                <Calendar size={16} />
              </span>
              <span className="flex-month-label">{monthLabel}</span>
              <input
                type="month"
                className="flex-month-native"
                value={monthInputValue(month)}
                onChange={(e) => setMonth(parseMonthInput(e.target.value))}
                aria-label="Elegir mes"
              />
            </label>
            <button
              type="button"
              className="flex-month-nav"
              aria-label="Mes siguiente"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => void handleExport()} disabled={exporting}>
            <Download size={16} /> {exporting ? 'Exportando…' : 'Excel mensual'}
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>
        <form className="card" onSubmit={handleAdd}>
          <h3 className="card-title">Cargar envío</h3>
          <p className="card-subtitle">Elegí el lugar; la zona y el precio se asignan solos</p>

          <div className="field">
            <label>Fecha</label>
            <input
              type="date"
              className="input"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Lugar</label>
            <select
              className="input"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              required
            >
              {FLEX_ALL_LOCALITIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Zona (automática)</label>
            <input
              className="input"
              value={
                zone
                  ? `${FLEX_ZONE_LABELS[zone]} — ${formatCurrency(unitPrice)}`
                  : 'Seleccioná un lugar'
              }
              readOnly
              disabled
            />
          </div>

          <div className="field">
            <label>Cantidad de paquetes</label>
            <input
              type="number"
              className="input"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <p className="muted" style={{ margin: '8px 0 12px' }}>
            Subtotal: <strong>{formatCurrency(previewTotal)}</strong>
          </p>

          <button type="submit" className="btn btn-primary" disabled={saving || !zone}>
            <Plus size={16} /> {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </form>

        <div className="card">
          <h3 className="card-title">Resumen del mes</h3>
          <div className="stats-grid" style={{ marginTop: 12 }}>
            {FLEX_ZONE_IDS.map((id) => (
              <div key={id} className="stat-pill">
                <span className="muted">{FLEX_ZONE_LABELS[id]}</span>
                <strong>{summary.counts[id]}</strong>
                <span className="muted">{formatCurrency(summary.counts[id] * FLEX_ZONE_PRICES[id])}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div className="muted">Total pedidos</div>
              <strong style={{ fontSize: 22 }}>{summary.totalPedidos}</strong>
            </div>
            <div>
              <div className="muted">Total facturado</div>
              <strong style={{ fontSize: 22 }}>{formatCurrency(summary.totalRecaudado)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, marginTop: 16 }}>
        <div className="card">
          <h3 className="card-title">Zonas con más envíos</h3>
          {zoneStats.every((z) => z.quantity === 0) ? (
            <p className="muted">Sin datos este mes</p>
          ) : (
            <ul className="list-plain">
              {zoneStats.map((z) => (
                <li key={z.zone} className="list-row">
                  <span>{z.zoneLabel}</span>
                  <span>
                    {z.quantity} · {formatCurrency(z.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="card-title">Localidades top</h3>
          {localityStats.length === 0 ? (
            <p className="muted">Sin datos este mes</p>
          ) : (
            <ul className="list-plain">
              {localityStats.map((s) => (
                <li key={`${s.zone}-${s.locality}`} className="list-row">
                  <span>
                    {s.locality} <span className="muted">({s.zoneLabel})</span>
                  </span>
                  <span>
                    {s.quantity} · {formatCurrency(s.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card flex-control-card" style={{ marginTop: 16 }}>
        <h3 className="card-title">Control mensual</h3>
        <p className="card-subtitle">Misma estructura que el Excel de pedidos Flex</p>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <div className="flex-control-wrap">
            <table className="flex-control-table">
              <thead>
                <tr>
                  <th className="flex-col-date">Fecha</th>
                  <th className="flex-col-caba">CABA</th>
                  <th className="flex-col-z1">Zona 1</th>
                  <th className="flex-col-z2">Zona 2</th>
                  <th className="flex-col-z3">Zona 3</th>
                  <th className="flex-col-pedidos">Total pedidos</th>
                  <th className="flex-col-recaudado">Total recaudado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.dateId}
                    className={row.totalPedidos === 0 ? 'flex-row-empty' : 'flex-row-active'}
                  >
                    <td className="flex-col-date">{row.day}</td>
                    <td className={`flex-col-caba${row.counts.caba > 0 ? ' has-value' : ''}`}>
                      {row.counts.caba}
                    </td>
                    <td className={`flex-col-z1${row.counts.zona1 > 0 ? ' has-value' : ''}`}>
                      {row.counts.zona1}
                    </td>
                    <td className={`flex-col-z2${row.counts.zona2 > 0 ? ' has-value' : ''}`}>
                      {row.counts.zona2}
                    </td>
                    <td className={`flex-col-z3${row.counts.zona3 > 0 ? ' has-value' : ''}`}>
                      {row.counts.zona3}
                    </td>
                    <td className={`flex-col-pedidos${row.totalPedidos > 0 ? ' has-value' : ''}`}>
                      {row.totalPedidos}
                    </td>
                    <td className={`flex-col-recaudado${row.totalRecaudado > 0 ? ' has-value' : ''}`}>
                      {formatCurrency(row.totalRecaudado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">Últimos registros</h3>
        {recent.length === 0 ? (
          <p className="muted">Todavía no hay envíos cargados este mes</p>
        ) : (
          <ul className="list-plain">
            {recent.map((s) => (
              <li key={s.id} className="list-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={14} />
                  {format(s.date, 'dd/MM')} · {FLEX_ZONE_LABELS[s.zone]} · {s.locality} ×{s.quantity}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {formatCurrency(s.total)}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void handleDelete(s.id)}
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
