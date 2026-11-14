# Diagrama de componentes — Control+

**Versión:** 1.0  
**Autor:** Felipe Quesada  

---

## 1. Vista de componentes del monorepo

```mermaid
flowchart TB
  subgraph webApp [web]
    WebPages[Pages]
    WebCtx[Contexts]
    WebSvc[Services]
    WebUI[Components_UI]
  end

  subgraph mobileApp [mobile]
    MobileScreens[Screens_ExpoRouter]
    MobileCtx[Contexts]
    MobileSvc[Services]
    MobileUI[Components_UI]
  end

  subgraph sharedPkg [shared]
    SharedTypes[Types]
    SharedPlans[Plans_Payments]
    SharedUtils[Sale_Caja_Stock_Utils]
  end

  subgraph firebaseProj [firebase_functions]
    Rules[firestore.rules]
    Functions[Cloud_Functions]
  end

  WebPages --> WebCtx
  WebPages --> WebUI
  WebCtx --> WebSvc
  WebSvc --> SharedTypes
  WebSvc --> SharedUtils

  MobileScreens --> MobileCtx
  MobileScreens --> MobileUI
  MobileCtx --> MobileSvc
  MobileSvc --> SharedTypes
  MobileSvc --> SharedUtils

  SharedPlans --> SharedTypes
  Functions --> Rules
```

---

## 2. Componentes lógicos principales

| Componente | Ubicación | Función |
|------------|-----------|---------|
| Landing / Presentación | `web/src/pages/LandingPage.tsx`, `PresentationPage.tsx` | Marketing y tesis |
| AuthGate / BrandContext | `web` / `mobile` context | Sesión y marca activa |
| Sales / SaleForm | pages + components | Registrar ventas y borradores |
| Products | pages | Catálogo e import |
| Caja | pages | Cierre diario |
| Stock | pages | Inventario |
| Dashboard | pages | KPIs |
| Services Firebase | `*/services/*` | CRUD y queries |
| Shared utils | `shared/src/utils/*` | Reglas de cálculo reutilizables |
| Cloud Functions | `functions/` | Telegram, config web, jobs |
| Security Rules | `firebase/firestore.rules` | Autorización |

---

## 3. Interfaces entre componentes

| Desde | Hacia | Contrato |
|-------|-------|----------|
| UI | Services | Funciones async tipadas |
| Services | Firestore | Colecciones + `brandId` |
| Clients | Auth | Firebase Auth SDK |
| Functions | Telegram | Bot API + secrets |
| Web/Mobile | Shared | Imports npm workspace / path |

---

## 4. Diagrama de despliegue (simplificado)

```mermaid
flowchart LR
  UserBrowser[Navegador] --> Vercel[Vercel_Web]
  UserPhone[Android] --> APK[App_Expo]
  Vercel --> Firebase[Firebase_Project]
  APK --> Firebase
  Firebase --> Functions[Cloud_Functions]
  Functions --> Telegram[Telegram]
```
