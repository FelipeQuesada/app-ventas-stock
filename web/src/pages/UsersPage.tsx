import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import type { UserProfile, UserRole } from '@advance-coat/shared';
import { useAuth } from '../context/AuthContext';
import {
  listUsers,
  createUserAsAdmin,
  updateUserRole,
  getAuthErrorMessage,
} from '../services/auth';

export function UsersPage() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
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
    if (profile?.role === 'admin') void load();
  }, [profile?.role]);

  if (profile && profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      await createUserAsAdmin(email, password, name, role, {
        userId: user.uid,
        userName: profile?.name,
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('employee');
      setShowForm(false);
      await load();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(uid: string, nextRole: UserRole) {
    if (!user) return;
    await updateUserRole(uid, nextRole, {
      userId: user.uid,
      userName: profile?.name,
    });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: nextRole } : u)));
  }

  if (loading) return <div className="loading-screen">Cargando usuarios…</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h3 style={{ margin: 0 }}>Usuarios</h3>
          <p>Administración de accesos</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {showForm && (
        <form className="card" style={{ marginBottom: 16, maxWidth: 520 }} onSubmit={handleCreate}>
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
            />
          </div>
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
          <div className="field">
            <label>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="employee">Empleado</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Creando…' : 'Crear usuario'}
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
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td><strong>{u.name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    disabled={u.uid === user?.uid}
                    onChange={(e) => void handleRoleChange(u.uid, e.target.value as UserRole)}
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
