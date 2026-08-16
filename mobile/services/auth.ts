import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser,
  User,
  getAuth,
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
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types';
import { logAudit } from '@/services/audit';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

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
      return 'Email o contraseña incorrectos.';
    case 'permission-denied':
      return 'Firestore bloqueó el guardado. Creá la base de datos en Firebase Console y publicá las reglas de firestore.rules.';
    case 'unavailable':
    case 'failed-precondition':
      return 'Firestore no está disponible. Verificá que creaste la base de datos en Firebase Console.';
    case 'auth/not-authorized':
    case 'auth/user-disabled-app':
      return message || 'Tu usuario no tiene acceso. Contactá al administrador.';
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
  const profile = await getUserProfile(result.user.uid);
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

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = 'employee'
) {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);

  try {
    await createUserProfile(result.user, name, role);
    const profile = await getUserProfile(result.user.uid);
    if (!profile) {
      throw new Error('El perfil no se guardó en Firestore');
    }
    return result.user;
  } catch (error) {
    try {
      await deleteUser(result.user);
    } catch {
      // Si no se puede borrar, el usuario quedó huérfano en Auth
    }
    throw error;
  }
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
