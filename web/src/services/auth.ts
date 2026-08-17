import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  getAuth,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import type { UserProfile, UserRole } from '@advance-coat/shared';
import { auth, db, firebaseConfig } from '../lib/firebase';
import { logAudit } from './audit';

export function getAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  const message = (error as { message?: string })?.message ?? '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ese email ya está registrado. Probá iniciar sesión o recuperar la contraseña.';
    case 'auth/invalid-email':
      return 'El email no es válido.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email o contraseña incorrectos. Revisá el email o usá "¿Olvidaste tu contraseña?".';
    case 'permission-denied':
      return 'Firestore bloqueó el acceso a tu perfil. Publicá las reglas de firestore.rules en Firebase Console.';
    case 'unavailable':
    case 'failed-precondition':
      return 'Firestore no está disponible. Verificá que creaste la base de datos en Firebase Console.';
    case 'auth/not-authorized':
    case 'auth/user-disabled-app':
    case 'auth/owner-password-mismatch':
      return message || 'Tu usuario no tiene acceso. Contactá al administrador.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Esperá unos minutos y probá de nuevo.';
    default:
      if (message.includes('Firestore')) {
        return `Error de base de datos: ${message}`;
      }
      return message || 'Ocurrió un error. Intentá de nuevo.';
  }
}

function accessError(code: string, message: string) {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

export async function signIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  let profile: UserProfile | null;
  try {
    profile = await getUserProfile(result.user.uid);
  } catch (err) {
    await signOut(auth);
    throw err;
  }
  if (!profile) {
    await signOut(auth);
    throw accessError(
      'auth/not-authorized',
      'Tu cuenta no tiene acceso. Pedile al administrador que te cree el usuario.'
    );
  }
  if (profile.active === false) {
    await signOut(auth);
    throw accessError(
      'auth/user-disabled-app',
      'Tu usuario está desactivado. Contactá al administrador.'
    );
  }
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changeUserPassword(newPassword: string) {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay sesión activa');
  await updatePassword(user, newPassword);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    email: data.email,
    name: data.name,
    role: data.role as UserRole,
    active: data.active !== false,
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function listUsers(): Promise<UserProfile[]> {
  const q = query(collection(db, 'users'), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email as string,
      name: data.name as string,
      role: data.role as UserRole,
      active: data.active !== false,
      createdAt: data.createdAt?.toDate?.(),
    };
  });
}

export async function createUserProfile(
  user: User,
  name: string,
  role: UserRole = 'employee'
) {
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email ?? '',
    name,
    role,
    active: true,
    createdAt: serverTimestamp(),
  });
}

/** Email autorizado para el setup inicial del dueño (solo web /admin/setup). */
export const OWNER_ADMIN_EMAIL = 'felimq09@gmail.com';

/**
 * Crea o actualiza el perfil de dueño como admin.
 * Si el Auth ya existe, inicia sesión con la contraseña e intenta setear el perfil.
 */
export async function bootstrapOwnerAdmin(
  email: string,
  password: string,
  name: string
): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== OWNER_ADMIN_EMAIL) {
    throw accessError(
      'auth/not-authorized',
      'Este setup solo está habilitado para el administrador autorizado.'
    );
  }

  let uid: string;
  try {
    const created = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    uid = created.user.uid;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/email-already-in-use') throw err;
    try {
      const signed = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      uid = signed.user.uid;
    } catch (signInErr) {
      const signInCode = (signInErr as { code?: string })?.code ?? '';
      if (
        signInCode === 'auth/invalid-credential' ||
        signInCode === 'auth/wrong-password' ||
        signInCode === 'auth/user-not-found'
      ) {
        throw accessError(
          'auth/owner-password-mismatch',
          'Ese email ya tiene cuenta en Firebase con otra contraseña. Usá la contraseña existente o restablecela con el botón de abajo.'
        );
      }
      throw signInErr;
    }
  }

  const existing = await getUserProfile(uid);
  if (existing?.role === 'admin' && existing.active !== false) {
    return existing;
  }

  const payload: Record<string, unknown> = {
    email: normalizedEmail,
    name: name.trim(),
    role: 'admin',
    active: true,
    updatedAt: serverTimestamp(),
  };
  if (!existing) {
    payload.createdAt = serverTimestamp();
  }

  await setDoc(doc(db, 'users', uid), payload, { merge: true });

  const profile = await getUserProfile(uid);
  if (!profile) throw new Error('No se pudo crear el perfil de administrador');
  return profile;
}

/**
 * Crea el perfil admin del dueño cuando ya hay sesión iniciada.
 * Sirve cuando el usuario de Auth existe pero el documento en Firestore falta.
 */
export async function completeOwnerAdminProfile(name: string): Promise<UserProfile> {
  const current = auth.currentUser;
  if (!current) {
    throw accessError('auth/not-authorized', 'No hay sesión iniciada.');
  }
  const currentEmail = current.email?.trim().toLowerCase() ?? '';
  if (currentEmail !== OWNER_ADMIN_EMAIL) {
    throw accessError(
      'auth/not-authorized',
      'Este setup solo está habilitado para el administrador autorizado.'
    );
  }

  await setDoc(
    doc(db, 'users', current.uid),
    {
      email: currentEmail,
      name: name.trim() || current.displayName || 'Administrador',
      role: 'admin',
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const profile = await getUserProfile(current.uid);
  if (!profile) throw new Error('No se pudo crear el perfil de administrador');
  return profile;
}

export async function ensureUserProfile(user: User, name?: string): Promise<UserProfile> {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const fallbackName =
    name?.trim() ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Usuario';

  await createUserProfile(user, fallbackName, 'employee');
  const profile = await getUserProfile(user.uid);
  if (!profile) {
    throw new Error('No se pudo crear el perfil en Firestore');
  }
  return profile;
}

/** Crea un usuario sin reemplazar la sesión del admin (app Firebase secundaria). */
export async function createUserAsAdmin(
  email: string,
  password: string,
  name: string,
  role: UserRole,
  actor: { userId: string; userName?: string }
): Promise<UserProfile> {
  const appName = `Secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const result = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim(),
      password
    );
    await createUserProfile(result.user, name.trim(), role);
    await logAudit({
      action: 'user_create',
      entityType: 'user',
      entityId: result.user.uid,
      summary: `Usuario creado: ${name} (${role})`,
      userId: actor.userId,
      userName: actor.userName,
    });
    const profile = await getUserProfile(result.user.uid);
    if (!profile) throw new Error('No se pudo crear el perfil');
    return profile;
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // ignore
    }
    try {
      await deleteApp(secondaryApp);
    } catch {
      // ignore
    }
  }
}

export async function updateUserRole(
  uid: string,
  role: UserRole,
  actor: { userId: string; userName?: string }
): Promise<void> {
  await updateUser(uid, { role }, actor);
}

export async function updateUser(
  uid: string,
  data: { name?: string; role?: UserRole; active?: boolean },
  actor: { userId: string; userName?: string }
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data);
  const parts = [
    data.name ? `nombre: ${data.name}` : null,
    data.role ? `rol: ${data.role}` : null,
    data.active === false ? 'desactivado' : data.active === true ? 'activado' : null,
  ].filter(Boolean);
  await logAudit({
    action: 'user_update',
    entityType: 'user',
    entityId: uid,
    summary: `Usuario actualizado (${parts.join(', ')})`,
    userId: actor.userId,
    userName: actor.userName,
  });
}
