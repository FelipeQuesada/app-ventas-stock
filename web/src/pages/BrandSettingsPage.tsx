import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { DEFAULT_BRAND_ID, PLAN_DEFINITIONS } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { updateBrand } from '../services/brands';
import { storage } from '../lib/firebase';
import { ImageDropzone } from '../components/ImageDropzone';

const ADVANCE_LOGO_PATH = '/logo-advance.png';

export function BrandSettingsPage() {
  const { user } = useAuth();
  const { brand, isBrandAdmin, refreshBrand } = useBrand();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!brand) return;
    setName(brand.name ?? '');
    setPhone(brand.phone ?? '');
  }, [brand?.id, brand?.name, brand?.phone]);

  if (!isBrandAdmin) return <Navigate to="/app" replace />;
  if (!brand) return <div className="muted">Cargando marca…</div>;

  const isAdvance = brand.id === DEFAULT_BRAND_ID;
  const logoPreview = brand.logoUrl || (isAdvance ? ADVANCE_LOGO_PATH : null);

  async function uploadLogoBlob(blob: Blob, filename: string) {
    if (!brand || !user) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const path = `brands/${brand.id}/logo-${Date.now()}-${filename}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateBrand(brand.id, { logoUrl: url });
      await refreshBrand();
      setMessage('Logo actualizado.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!brand) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateBrand(brand.id, {
        name: name.trim(),
        phone: phone.trim() || null,
      });
      await refreshBrand();
      setMessage('Marca actualizada.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(file: File) {
    await uploadLogoBlob(file, file.name.replace(/[^\w.-]+/g, '_') || 'logo.jpg');
  }

  async function handleUseAdvanceLogo() {
    try {
      const res = await fetch(ADVANCE_LOGO_PATH);
      if (!res.ok) throw new Error('No se pudo cargar el logo de Advance');
      const blob = await res.blob();
      await uploadLogoBlob(blob, 'logo-advance.png');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const plan = PLAN_DEFINITIONS[brand.planId] ?? PLAN_DEFINITIONS.starter;

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Tu marca</h3>
        <p className="muted">
          Plan: <strong>{plan.name}</strong> · Estado: {brand.status}
        </p>

        <form onSubmit={handleSaveBrand} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="brandName">Nombre</label>
            <input id="brandName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="brandPhone">Teléfono</label>
            <input id="brandPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <ImageDropzone
            label="Logo de la marca"
            previewUrl={logoPreview}
            previewAlt={brand.name}
            disabled={saving}
            onFile={(file) => void handleLogoFile(file)}
          />

          {isAdvance && !brand.logoUrl ? (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 12 }}
              disabled={saving}
              onClick={() => void handleUseAdvanceLogo()}
            >
              Usar logo Advance guardado
            </button>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 16 }}>
            {saving ? 'Guardando…' : 'Guardar marca'}
          </button>
        </form>
      </div>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
