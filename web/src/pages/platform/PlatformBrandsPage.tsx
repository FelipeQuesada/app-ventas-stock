import { useEffect, useState } from 'react';
import { Building2, LogIn } from 'lucide-react';
import type { Brand, PlanId, BrandStatus } from '@advance-coat/shared';
import { PLAN_DEFINITIONS } from '@advance-coat/shared';
import { listBrands, updateBrand, ensureLegacyAdvanceBrand } from '../../services/brands';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { useNavigate } from 'react-router-dom';

export function PlatformBrandsPage() {
  const { user, profile } = useAuth();
  const { enterBrand } = useBrand();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setBrands(await listBrands());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleMigrate() {
    if (!user) return;
    setMigrating(true);
    setError('');
    try {
      await ensureLegacyAdvanceBrand(user.uid);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMigrating(false);
    }
  }

  async function handlePlan(brandId: string, planId: PlanId) {
    setSavingId(brandId);
    try {
      await updateBrand(brandId, { planId, status: planId === 'trial' ? 'trial' : 'active' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleStatus(brandId: string, status: BrandStatus) {
    setSavingId(brandId);
    try {
      await updateBrand(brandId, { status });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleEnter(brandId: string) {
    await enterBrand(brandId);
    navigate('/app');
  }

  return (
    <div>
      <div className="admin-hero card" style={{ marginBottom: 20 }}>
        <div className="admin-hero-icon">
          <Building2 size={28} />
        </div>
        <div>
          <h2>Marcas Control+</h2>
          <p>
            Hola {profile?.name?.split(' ')[0] ?? 'Admin'}. Acá gestionás todas las marcas,
            planes y accesos de la plataforma.
          </p>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={migrating}
          onClick={() => void handleMigrate()}
        >
          {migrating ? 'Migrando…' : 'Migrar / asegurar Advance Coat'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Recargar
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Cargando marcas…</p>
      ) : brands.length === 0 ? (
        <div className="card">
          <p>No hay marcas todavía. Corré la migración de Advance o esperá un registro nuevo.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Plan</th>
                <th>Estado</th>
                <th>Contacto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.name}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {b.slug} · {b.id}
                    </div>
                  </td>
                  <td>
                    <select
                      value={b.planId}
                      disabled={savingId === b.id}
                      onChange={(e) => void handlePlan(b.id, e.target.value as PlanId)}
                    >
                      {Object.values(PLAN_DEFINITIONS).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={b.status}
                      disabled={savingId === b.id}
                      onChange={(e) => void handleStatus(b.id, e.target.value as BrandStatus)}
                    >
                      <option value="active">Activa</option>
                      <option value="trial">Trial</option>
                      <option value="suspended">Suspendida</option>
                    </select>
                  </td>
                  <td>
                    <div>{b.email || '—'}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {b.phone || ''}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void handleEnter(b.id)}
                    >
                      <LogIn size={14} /> Entrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
