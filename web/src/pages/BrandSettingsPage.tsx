import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';
import { updateBrand } from '../services/brands';
import { updateUser } from '../services/auth';
import { storage } from '../lib/firebase';
import { PLAN_DEFINITIONS } from '@advance-coat/shared';

export function BrandSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { brand, isBrandAdmin, refreshBrand } = useBrand();
  const [name, setName] = useState(brand?.name ?? '');
  const [phone, setPhone] = useState(brand?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isBrandAdmin) return <Navigate to="/app" replace />;
  if (!brand) return <div className="muted">Cargando marca…</div>;

  async function handleSaveBrand(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateBrand(brand!.id, {
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

  async function handleLogo(file: File | null) {
    if (!file || !brand || !user) return;
    setSaving(true);
    setError('');
    try {
      const path = `brands/${brand.id}/logo-${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
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

  async function handlePhoto(file: File | null) {
    if (!file || !user || !profile) return;
    setSaving(true);
    setError('');
    try {
      const path = `brands/${brand!.id}/users/${user.uid}-${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateUser(user.uid, { photoUrl: url }, { userId: user.uid, userName: profile.name });
      await refreshProfile();
      setMessage('Foto de perfil actualizada.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
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
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12, marginTop: 12 }}
          />
        )}
        <form onSubmit={handleSaveBrand} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="brandName">Nombre</label>
            <input id="brandName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="brandPhone">Teléfono</label>
            <input id="brandPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="logo">Logo de la marca</label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => void handleLogo(e.target.files?.[0] ?? null)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar marca'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="card-title">Tu foto de perfil</h3>
        {profile?.photoUrl && (
          <img
            src={profile.photoUrl}
            alt={profile.name}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginBottom: 12 }}
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
        />
      </div>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
