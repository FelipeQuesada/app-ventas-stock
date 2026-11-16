import { useEffect, useState } from 'react';
import { Building2, LogIn } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Brand, PlanId, BrandStatus } from '@advance-coat/shared';
import { PLAN_DEFINITIONS } from '@advance-coat/shared';
import { listBrands, updateBrand } from '../../services/brands';
import { useAuth } from '../../context/AuthContext';
import { useBrand } from '../../context/BrandContext';
import { useNavigate } from 'react-router-dom';
import { PlatformPillSelect } from '../../components/PlatformPillSelect';
import { app } from '../../lib/firebase';

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
  const { profile } = useAuth();
  const { enterBrand } = useBrand();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState('');

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

  async function handleSealAdvance() {
    setMigrating(true);
    setMigrateMsg('');
    setError('');
    try {
      const fns = getFunctions(app, 'southamerica-east1');
      const seal = httpsCallable(fns, 'sealAdvanceLegacyBrandIds');
      // force: unifica duplicados "Advance Coat" y sellos raros → advance-coat
      const res = await seal({ force: true });
      const data = res.data as {
        ok?: boolean;
        summary?: Record<string, number>;
        brandIdSamples?: Record<string, Record<string, number>>;
        brands?: Array<{ id: string; name: string }>;
        dominantProductBrandId?: string | null;
        advanceMembers?: Array<{
          email: string;
          role: string;
          active: unknown;
          pendingApproval: unknown;
          brandId: unknown;
        }>;
      };
      const parts = Object.entries(data.summary ?? {}).map(([k, v]) => `${k}: ${v}`);
      const productIds = data.brandIdSamples?.products
        ? Object.entries(data.brandIdSamples.products)
            .map(([k, v]) => `${k}=${v}`)
            .join(', ')
        : '';
      const brandList = (data.brands ?? []).map((b) => `${b.id}(${b.name})`).join(', ');
      const members = (data.advanceMembers ?? [])
        .slice(0, 8)
        .map(
          (m) =>
            `${m.email || '(sin email)'} [${m.role}] active=${String(m.active)} pending=${String(m.pendingApproval)} brand=${String(m.brandId)}`
        )
        .join(' · ');
      setMigrateMsg(
        [
          parts.length ? `Sellado force — ${parts.join(' · ')}` : 'Sellado OK (sin cambios).',
          data.dominantProductBrandId
            ? `Dominant products brandId: ${data.dominantProductBrandId}`
            : '',
          productIds ? `Productos por brandId: ${productIds}` : '',
          brandList ? `Marcas: ${brandList}` : '',
          members ? `Miembros Advance: ${members}` : '',
        ]
          .filter(Boolean)
          .join(' | ')
      );
    } catch (err) {
      setError((err as Error).message || 'No se pudo migrar Advance');
    } finally {
      setMigrating(false);
    }
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
        <button type="button" className="btn btn-ghost" onClick={() => void load()}>
          Recargar
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={migrating}
          onClick={() => void handleSealAdvance()}
          title="Sella brandId advance-coat en docs viejos para que empleados vean datos"
        >
          {migrating ? 'Migrando Advance…' : 'Reparar datos Advance (empleados)'}
        </button>
      </div>

      {migrateMsg && <p className="muted">{migrateMsg}</p>}
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p className="muted">Cargando marcas…</p>
      ) : brands.length === 0 ? (
        <div className="card">
          <p>No hay marcas todavía. Esperá un registro nuevo.</p>
        </div>
      ) : (
        <div className="platform-brands-list">
          {brands.map((b) => (
            <article
              key={b.id}
              className={`card platform-brand-card${savingId === b.id ? ' is-saving' : ''}`}
            >
              <div className="platform-brand-card-top">
                <div className="platform-brand-cell">
                  <span className="platform-brand-avatar" aria-hidden>
                    {b.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="platform-brand-card-title">
                    <strong>{b.name}</strong>
                    <div className="muted platform-brand-meta">{b.slug}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleEnter(b.id)}
                >
                  <LogIn size={14} /> Entrar
                </button>
              </div>

              <div className="platform-brand-card-controls">
                <div className="platform-brand-field">
                  <span className="platform-brand-field-label">Plan</span>
                  <PlatformPillSelect
                    value={b.planId}
                    options={PLAN_OPTIONS}
                    disabled={savingId === b.id}
                    ariaLabel={`Plan de ${b.name}`}
                    toneClass={`plan-${b.planId}`}
                    onChange={(planId) => void handlePlan(b.id, planId)}
                  />
                </div>
                <div className="platform-brand-field">
                  <span className="platform-brand-field-label">Estado</span>
                  <PlatformPillSelect
                    value={b.status}
                    options={STATUS_OPTIONS}
                    disabled={savingId === b.id}
                    ariaLabel={`Estado de ${b.name}`}
                    toneClass={`status-${b.status}`}
                    onChange={(status) => void handleStatus(b.id, status)}
                  />
                </div>
              </div>

              <div className="platform-contact">
                <span className="platform-contact-email">{b.email || '—'}</span>
                {b.phone ? <span className="muted">{b.phone}</span> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
