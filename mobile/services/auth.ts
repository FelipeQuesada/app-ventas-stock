import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
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
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  DEFAULT_BRAND_ID,
  getPlanLimits,
  isSuperAdminEmail,
} from '@advance-coat/shared';
import { auth, db } from '@/lib/firebase';
import { UserProfile, UserRole, BrandRole } from '@/types';
import { logAudit } from '@/services/audit';
import {
  createBrand,
  getBrand,
  isSlugAvailable,
  slugifyBrandName,
  findBrandByOwnerUid,
  ensureLegacyAdvanceBrand,
} from '@/services/brands';
import { requireBrandId, getActiveBrandId } from '@/lib/brandScope';

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
      return 'Email o contraseña incorrectos. Revisá el email o usá "¿Olvidaste tu contraseña?".';
    case 'permission-denied':
      return 'Firestore bloqueó el acceso. Publicá las reglas actualizadas en Firebase Console.';
    case 'unavailable':
    case 'failed-precondition':
      return 'Firestore no está disponible.';
    case 'auth/not-authorized':
    case 'auth/user-disabled-app':
    case 'auth/brand-suspended':
      return message || 'Tu usuario no tiene acceso.';
    default:
      return message || 'Ocurrió un error. Intentá de nuevo.';
  }
}

function accessError(code: string, message: string) {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

function mapProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const email = (data.email as string) || '';
  let role = data.role as UserRole;
  if (isSuperAdminEmail(email)) role = 'super_admin';
  return {
    uid,
    email,
    name: data.name as string,
    role,
    brandId: (data.brandId as string | null | undefined) ?? null,
    photoUrl: (data.photoUrl as string) || undefined,
    active: data.active !== false,
    pendingApproval: data.pendingApproval === true,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.(),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return mapProfile(uid, snap.data());
}

export async function repairOwnerProfileIfMissing(user: User): Promise<UserProfile | null> {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const brand = await findBrandByOwnerUid(user.uid);
  if (!brand) return null;

  await setDoc(
    doc(db, 'users', user.uid),
    {
      email: (user.email ?? brand.email ?? '').toLowerCase(),
      name: user.displayName || brand.name || 'Dueño',
      role: 'owner',
      brandId: brand.id,
      active: true,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return getUserProfile(user.uid);
}

export async function signIn(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  let profile: UserProfile | null;
  try {
    profile = await getUserProfile(result.user.uid);
    if (!profile) {
      profile = await repairOwnerProfileIfMissing(result.user);
    }
  } catch (err) {
    await signOut(auth);
    throw err;
  }

  if (!profile) {
    if (isSuperAdminEmail(result.user.email)) {
      await setDoc(doc(db, 'users', result.user.uid), {
        email: result.user.email,
        name: 'Super Admin',
        role: 'super_admin',
        brandId: null,
        active: true,
        createdAt: serverTimestamp(),
      });
      await ensureLegacyAdvanceBrand(result.user.uid).catch(() => undefined);
      return result.user;
    }
    await signOut(auth);
    throw accessError(
      'auth/not-authorized',
      'Tu cuenta no tiene acceso. Registrá tu marca o pedile acceso al dueño.'
    );
  }

  if (profile.active === false) {
    await signOut(auth);
    throw accessError('auth/user-disabled-app', 'Tu usuario está desactivado.');
  }

  if (isSuperAdminEmail(profile.email) && profile.role !== 'super_admin') {
    await updateDoc(doc(db, 'users', profile.uid), { role: 'super_admin', brandId: null });
  }

  if (profile.role !== 'super_admin' && !profile.brandId) {
    await updateDoc(doc(db, 'users', profile.uid), { brandId: DEFAULT_BRAND_ID });
    await ensureLegacyAdvanceBrand(profile.uid).catch(() => undefined);
  }

  if (profile.role !== 'super_admin' && profile.brandId) {
    const brand = await getBrand(profile.brandId);
    if (brand?.status === 'suspended') {
      await signOut(auth);
      throw accessError('auth/brand-suspended', 'Esta marca está suspendida.');
    }
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

export async function listUsers(brandId?: string): Promise<UserProfile[]> {
  const bid = brandId ?? getActiveBrandId() ?? undefined;
  if (bid) {
    try {
      const q = query(collection(db, 'users'), where('brandId', '==', bid), orderBy('name'));
      const snap = await getDocs(q);
      return snap.docs.map((d) => mapProfile(d.id, d.data())).filter((u) => u.role !== 'super_admin');
    } catch {
      const all = await getDocs(query(collection(db, 'users'), orderBy('name')));
      return all.docs
        .map((d) => mapProfile(d.id, d.data()))
        .filter((u) => u.brandId === bid && u.role !== 'super_admin');
    }
  }
  const snap = await getDocs(query(collection(db, 'users'), orderBy('name')));
  return snap.docs.map((d) => mapProfile(d.id, d.data())).filter((u) => u.role !== 'super_admin');
}

export async function createUserProfile(
  user: User,
  name: string,
  role: UserRole = 'employee',
  brandId?: string | null
) {
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email ?? '',
    name,
    role,
    brandId: brandId === undefined ? null : brandId,
    active: true,
    createdAt: serverTimestamp(),
  });
}

/** Registro de marca con plan gratis (starter). */
export async function registerBrandOwner(input: {
  email: string;
  password: string;
  ownerName: string;
  brandName: string;
  phone?: string;
  cuit?: string;
}): Promise<{ user: User; brandId: string }> {
  const brandName = input.brandName.trim();
  if (brandName.length < 2) {
    throw accessError('auth/invalid-email', 'El nombre de la marca es demasiado corto.');
  }

  const email = input.email.trim().toLowerCase();
  let user = auth.currentUser;

  if (!user) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, input.password);
      user = result.user;
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        const signed = await signInWithEmailAndPassword(auth, email, input.password);
        user = signed.user;
        const existing = await getUserProfile(user.uid);
        if (existing?.brandId) return { user, brandId: existing.brandId };
        const owned = await findBrandByOwnerUid(user.uid);
        if (owned) {
          const repaired = await repairOwnerProfileIfMissing(user);
          if (repaired?.brandId) return { user, brandId: repaired.brandId };
        }
      } else {
        throw err;
      }
    }
  }

  if (!user) throw new Error('No se pudo crear la sesión');

  const already = await getUserProfile(user.uid);
  if (already?.brandId) return { user, brandId: already.brandId };

  const owned = await findBrandByOwnerUid(user.uid);
  if (owned) {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        email: (user.email ?? email).toLowerCase(),
        name: input.ownerName.trim(),
        role: 'owner',
        brandId: owned.id,
        active: true,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { user, brandId: owned.id };
  }

  let slug = slugifyBrandName(brandName);
  try {
    const available = await isSlugAvailable(slug);
    if (!available) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  } catch {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const brand = await createBrand({
    name: brandName,
    slug,
    ownerUid: user.uid,
    planId: 'starter',
    status: 'active',
    phone: input.phone,
    email,
    cuit: input.cuit,
  });

  await setDoc(doc(db, 'users', user.uid), {
    email: (user.email ?? email).toLowerCase(),
    name: input.ownerName.trim(),
    role: 'owner',
    brandId: brand.id,
    active: true,
    createdAt: serverTimestamp(),
  });

  const profile = await getUserProfile(user.uid);
  if (!profile) {
    throw new Error('La marca se creó pero no pudimos leer tu perfil. Reintentá.');
  }

  return { user, brandId: brand.id };
}

export async function createUserAsAdmin(
  email: string,
  password: string,
  name: string,
  role: BrandRole,
  actor: { userId: string; userName?: string; brandId?: string }
): Promise<UserProfile> {
  const brandId = actor.brandId ?? requireBrandId();
  const brand = await getBrand(brandId);
  if (brand) {
    const limits = getPlanLimits(brand.planId);
    const existing = await listUsers(brandId);
    if (existing.length >= limits.maxUsers) {
      throw accessError(
        'auth/not-authorized',
        `Tu plan permite hasta ${limits.maxUsers} usuarios.`
      );
    }
  }

  const appName = `Secondary-${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const result = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    await createUserProfile(result.user, name.trim(), role, brandId);
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

export async function updateUser(
  uid: string,
  data: { name?: string; role?: UserRole; active?: boolean; photoUrl?: string | null },
  actor: { userId: string; userName?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.role !== undefined) payload.role = data.role;
  if (data.active !== undefined) payload.active = data.active;
  if (data.photoUrl !== undefined) payload.photoUrl = data.photoUrl;
  await updateDoc(doc(db, 'users', uid), payload);
  await logAudit({
    action: 'user_update',
    entityType: 'user',
    entityId: uid,
    summary: `Usuario actualizado`,
    userId: actor.userId,
    userName: actor.userName,
  });
}

export async function updateUserRole(
  uid: string,
  role: UserRole,
  actor: { userId: string; userName?: string }
): Promise<void> {
  await updateUser(uid, { role }, actor);
}
