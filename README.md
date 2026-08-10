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

### Mobile (APK)

```bash
# Variables en mobile/.env (EXPO_PUBLIC_FIREBASE_*)
cp mobile/.env.example mobile/.env   # si hace falta

npm run mobile
# o
npm run start --workspace=mobile

# Build APK
npm run mobile:apk
```

### Web

```bash
# Variables en web/.env (VITE_FIREBASE_*)
# Mismos valores que EXPO_PUBLIC_FIREBASE_* pero con prefijo VITE_

npm run web
# Build producción
npm run web:build
```

Abrí http://localhost:5173

## Deploy web (Vercel)

- Root del proyecto: repo raíz
- Build: `npm run web:build`
- Output: `web/dist`
- Env vars: las 6 `VITE_FIREBASE_*`

En Firebase Console → Authentication → Authorized domains, agregá el dominio de Vercel.

## Notas

- La APK **no se reemplaza** por la web; conviven.
- En web no hay registro público (solo login; usuarios vía admin).
- La cola offline de Expo no aplica en web.
