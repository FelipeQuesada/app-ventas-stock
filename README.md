# Advance Coat Ventas

Monorepo con **APK (Expo)** y **Web (React + Vite)** sobre el mismo Firebase.

```
mobile/   → App Android (Expo / EAS)
web/      → Panel web (Vite + React)
shared/   → Tipos, constantes y utils compartidos
```

## Requisitos

- Node.js 20+
- Cuenta Firebase (mismas credenciales para mobile y web)

## Setup

```bash
npm install
```

Las variables de entorno van **solo** en archivos locales ignorados por git o en secrets de Firebase / panel de Vercel. **No** hay plantillas `.env.example` en el repo.

Para desarrollo web local creá `web/src/lib/firebaseConfig.local.ts` (gitignored) exportando `localFirebaseConfig`. En producción la config sale de la Cloud Function `getWebFirebaseConfig`.

### Mobile (APK)

```bash
npm run mobile
# Build APK
npm run mobile:apk
```

### Web

```bash
npm run web
# Build producción
npm run web:build
```

Abrí http://localhost:5173

## Deploy web (Vercel)

- Root del proyecto: repo raíz
- Build: `npm run web:build`
- Output: `web/dist`
- Variables de Firebase: configurarlas en el panel de Vercel (nunca en el repo). En Google Cloud Console, restringí la clave web por dominio HTTP.

En Firebase Console → Authentication → Authorized domains, agregá el dominio de Vercel.

## Telegram (Cloud Functions)

Secretos (no van en el front ni en Vercel):

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
firebase functions:secrets:set WEB_CLIENT_FIREBASE_CONFIG
```

`WEB_CLIENT_FIREBASE_CONFIG` es un JSON con la config web del cliente (misma info que usabas en Vercel, pero fuera del repo y del bundle estático).

## Notas

- La APK **no se reemplaza** por la web; conviven.
- En web no hay registro público (solo login; usuarios vía admin).
- Tiendanube: sin token en el navegador; cuando se reactive, las credenciales van solo en Cloud Functions.
- La cola offline de Expo no aplica en web.
