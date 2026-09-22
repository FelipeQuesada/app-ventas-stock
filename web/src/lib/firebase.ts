import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/**
 * Config web: no se versiona en el repo ni se embebe en el bundle de producción.
 * - Dev: archivo local gitignored `firebaseConfig.local.ts`
 * - Prod: Cloud Function getWebFirebaseConfig (secret WEB_CLIENT_FIREBASE_CONFIG)
 */
const CONFIG_URL =
  (import.meta.env.VITE_FIREBASE_CONFIG_URL as string | undefined)?.trim() ||
  'https://southamerica-east1-advancecoat-ventas-stock.cloudfunctions.net/getWebFirebaseConfig';

let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;
export let storage: FirebaseStorage;
export let firebaseConfig: FirebaseOptions;

let initPromise: Promise<void> | null = null;

async function configFromLocalDev(): Promise<FirebaseOptions | null> {
  if (!import.meta.env.DEV) return null;
  // Glob opcional: si el archivo gitignored no existe (CI/Vercel), el mapa queda vacío.
  const loaders = import.meta.glob<{ localFirebaseConfig: FirebaseOptions }>(
    './firebaseConfig.local.ts',
  );
  const loader = loaders['./firebaseConfig.local.ts'];
  if (!loader) return null;
  try {
    const mod = await loader();
    return mod.localFirebaseConfig;
  } catch {
    return null;
  }
}

async function configFromServer(): Promise<FirebaseOptions> {
  const res = await fetch(CONFIG_URL, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`No se pudo cargar la configuración Firebase (${res.status})`);
  }
  return (await res.json()) as FirebaseOptions;
}

async function resolveConfig(): Promise<FirebaseOptions> {
  const local = await configFromLocalDev();
  if (local) return local;
  return configFromServer();
}

export async function initFirebase(): Promise<void> {
  if (getApps().length > 0) {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    return;
  }
  if (!initPromise) {
    initPromise = (async () => {
      firebaseConfig = await resolveConfig();
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    })();
  }
  await initPromise;
}
