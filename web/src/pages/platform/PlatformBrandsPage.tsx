import { useEffect, useState } from 'react';
import { Building2, LogIn } from 'lucide-react';
import type { Brand, PlanId, BrandStatus } from '@advance-coat/shared';
import { PLAN_DEFINITIONS } from '@advance-coat/shared';
import { listBrands, updateBrand, ensureLegacyAdvanceBrand } from '../../services/brands';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { useNavigate } from 'react-router-dom';
import { PlatformPillSelect } from '../../components/PlatformPillSelect';

const PLAN_OPTIONS = Object.values(PLAN_DEFINITIONS).map((p) => ({
  value: p.id,
  label: p.name,
  tone: `plan-${p.id}`,
}));

const STATUS_OPTIONS: { value: BrandStatus; label: string; tone: string }[] = [
  { value: 'active', label: 'Activa', tone: 'status-active' },
  { value: 'trial', label: 'Trial', tone: 'status-trial' },
  { value: 'suspended', label: 'Suspendida', tone: 'status-suspended' },
];

export function PlatformBrandsPage() {
  const { user, profile } = useAuth();
  const { enterBrand } = useBrand();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');
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

  async function handleMigrate() {
    if (!user) return;
    setMigrating(true);
    setError('');
    setMigrateMsg('');
    try {
      const result = await ensureLegacyAdvanceBrand(user.uid);
      setMigrateMsg(
        `Advance listo. Usuarios pasados a Advance: ${result.usersUpdated}. Documentos sellados: ${result.docsUpdated}.`
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMigrating(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // Al abrir el panel, migrá usuarios/docs legacy a Advance automáticamente
  useEffect(() => {
    if (!user) return;
    void handleMigrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

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
      {migrateMsg && <p className="success-text">{migrateMsg}</p>}
      {loading ? (
        <p className="muted">Cargando marcas…</p>
      ) : brands.length === 0 ? (
        <div className="card">
          <p>No hay marcas todavía. Corré la migración de Advance o esperá un registro nuevo.</p>
        </div>
      ) : (
        <div className="table-wrap card platform-brands-table">
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
                <tr key={b.id} className={savingId === b.id ? 'is-saving' : undefined}>
                  <td>
                    <div className="platform-brand-cell">
                      <span className="platform-brand-avatar" aria-hidden>
                        {b.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{b.name}</strong>
                        <div className="muted platform-brand-meta">
                          {b.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <PlatformPillSelect
                      value={b.planId}
                      options={PLAN_OPTIONS}
                      disabled={savingId === b.id}
                      ariaLabel={`Plan de ${b.name}`}
                      toneClass={`plan-${b.planId}`}
                      onChange={(planId) => void handlePlan(b.id, planId)}
                    />
                  </td>
                  <td>
                    <PlatformPillSelect
                      value={b.status}
                      options={STATUS_OPTIONS}
                      disabled={savingId === b.id}
                      ariaLabel={`Estado de ${b.name}`}
                      toneClass={`status-${b.status}`}
                      onChange={(status) => void handleStatus(b.id, status)}
                    />
                  </td>
                  <td>
                    <div className="platform-contact">
                      <span>{b.email || '—'}</span>
                      {b.phone ? <span className="muted">{b.phone}</span> : null}
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
