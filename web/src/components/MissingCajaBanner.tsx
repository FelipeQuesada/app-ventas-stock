import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { formatShortDate } from '@advance-coat/shared';
import { getMissingPreviousDayCierre } from '../services/caja';

/** Aviso si el día calendario anterior no tiene cierre en la app. */
export function MissingCajaBanner() {
  const [missingDate, setMissingDate] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const missing = await getMissingPreviousDayCierre();
        if (!cancelled) setMissingDate(missing);
      } catch {
        if (!cancelled) setMissingDate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!missingDate) return null;

  const dateParam = format(missingDate, 'yyyy-MM-dd');

  return (
    <div className="alert alert-warning" style={{ marginBottom: 16 }}>
      <AlertTriangle size={20} color="#B45309" />
      <div style={{ flex: 1 }}>
        <strong>Falta el cierre de caja del {formatShortDate(missingDate)}</strong>
        <p className="muted" style={{ margin: '4px 0 10px' }}>
          No hay registro en la app para ese día. Si se cerró a mano, cargalo ahora.
        </p>
        <Link to={`/caja/register?date=${dateParam}`} className="btn btn-ghost btn-sm">
          Registrar día faltante
        </Link>
      </div>
    </div>
  );
}
