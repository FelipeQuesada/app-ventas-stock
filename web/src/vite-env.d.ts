/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL opcional de la CF que sirve la config del cliente. */
  readonly VITE_FIREBASE_CONFIG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
