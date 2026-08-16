import { useEffect, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import type { UserProfile, UserRole } from '@advance-coat/shared';
import { useAuth } from '../../context/AuthContext';
import {
  listUsers,
  createUserAsAdmin,
  updateUser,
  getAuthErrorMessage,
} from '../../services/auth';

type FormMode = 'create' | 'edit';

export function AdminUsersPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<FormMode | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setUsers(await listUsers());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setMode('create');
    setEditingUid(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setActive(true);
    setError('');
  }

  function openEdit(u: UserProfile) {
    setMode('edit');
    setEditingUid(u.uid);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setActive(u.active !== false);
    setError('');
  }

  function closeForm() {
    setMode(null);
    setEditingUid(null);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      if (mode === 'create') {
        await createUserAsAdmin(email, password, name, role, {
          userId: user.uid,
          userName: profile?.name,
        });
      } else if (editingUid) {
        await updateUser(
          editingUid,
          { name: name.trim(), role, active },
          { userId: user.uid, userName: profile?.name }
        );
      }
      closeForm();
      await load();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(u: UserProfile) {
    if (!user || u.uid === user.uid) return;
    const next = u.active === false;
    await updateUser(
      u.uid,
      { active: next },
      { userId: user.uid, userName: profile?.name }
    );
    setUsers((prev) => prev.map((item) => (item.uid === u.uid ? { ...item, active: next } : item)));
  }

  if (loading) return <div className="loading-screen">Cargando usuarios…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Usuarios</h3>
          <p>Altas, roles y activación de accesos</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {mode && (
        <form className="card" style={{ marginBottom: 16, maxWidth: 520 }} onSubmit={handleSubmit}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              {mode === 'create' ? 'Crear usuario' : 'Editar usuario'}
            </h3>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={closeForm}>
              <X size={16} />
            </button>
          </div>
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mode === 'edit'}
            />
          </div>
          {mode === 'create' && (
            <div className="field">
              <label>Contraseña temporal</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}
          <div className="field">
            <label>Rol</label>
            <select
              className="select-input"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="employee">Empleado</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {mode === 'edit' && editingUid !== user?.uid && (
            <div className="field">
              <label>Estado</label>
              <select
                className="select-input"
                value={active ? 'active' : 'inactive'}
                onChange={(e) => setActive(e.target.value === 'active')}
              >
                <option value="active">Activo</option>
                <option value="inactive">Desactivado</option>
              </select>
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isActive = u.active !== false;
              return (
                <tr key={u.uid}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role === 'admin' ? 'Admin' : 'Empleado'}</td>
                  <td>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-muted'}`}>
                      {isActive ? 'Activo' : 'Desactivado'}
                    </span>
                  </td>
                  <td>
                    <div className="actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil size={14} />
                      </button>
                      {u.uid !== user?.uid && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleToggleActive(u)}
                        >
                          {isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
