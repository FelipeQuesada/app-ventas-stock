# CARRERA: ANÁLISIS DE SISTEMAS  
# PROPUESTA DE PROYECTO – TRABAJO FINAL DE CARRERA

**Nombre de Proyecto:** Control+  
**Alumno:** Felipe Quesada  
**Versión:** 1.0  

---

## Tabla de contenidos

1. Introducción  
   1.1 Objetivo del documento  
   1.2 Descripción del equipo  
2. Descripción del proyecto  
   2.1 Nombre  
   2.2 Alcance  
   2.3 Tecnología  
   2.4 Necesidades a satisfacer / Oportunidad  
   2.5 Beneficios esperados  
   2.6 Investigación de mercado  

---

## 1. Introducción

En comercios pequeños (kioscos, almacenes, tiendas y operaciones mayoristas) el control de ventas, stock y caja suele hacerse con planillas, anotaciones o sistemas genéricos poco adaptados al mostrador. Eso genera diferencias de inventario, cierres de caja incompletos y falta de trazabilidad cuando el dueño no está en el local.

Control+ surge como sistema web y móvil (mobile first) para registrar ventas, descontar stock automáticamente, cerrar caja, gestionar productos y equipo por roles, con datos sincronizados en tiempo real.

### 1.1 Objetivo del documento

Definir la solución de la problemática sobre la cual se desarrolla el proyecto final en el Seminario de Sistemas de la carrera Analista de Sistemas (Escuela Da Vinci): un sistema multiplataforma de ventas, stock y caja orientado a comercios.

### 1.2 Descripción del equipo

**Integrante:** Felipe Quesada  

**Experiencia y conocimientos:**  
Desarrollo de aplicaciones web y móviles con TypeScript, React, React Native y Expo. Uso de Firebase Authentication, Cloud Firestore, Cloud Functions y Storage. Diseño de modelos multi-tenant (marcas), reglas de seguridad y despliegue (Vercel / EAS). Conocimiento del dominio de ventas minoristas y mayoristas.

**Necesidades de capacitación:**  
Optimización de rendimiento multiplataforma, profundización en seguridad y operaciones en producción, y evolución de integraciones de pago / notificaciones.

---

## 2. Descripción del proyecto

### 2.1 Nombre

**Control+** — Sistema de ventas, stock y caja para comercios.  
Sitio: https://controlmas.com.ar  

### 2.2 Alcance

Control+ es una plataforma **web** y **móvil** que comparte la misma base de datos (Firebase). Permite a dueños y empleados operar el local: vender, controlar inventario, cerrar caja, emitir presupuestos (según plan), consultar estadísticas y recibir avisos (Telegram en planes Pro+).

Soporta **multi-marca** (tenants): cada comercio tiene su marca, usuarios, productos y configuración. Un super administrador de plataforma puede gestionar marcas.

#### Funcionalidades principales

| Nombre | Descripción | Tipificación | Web / Mobile |
|--------|-------------|--------------|--------------|
| Registrarse / crear marca | Alta de cuenta dueño y marca | ABM | Ambas |
| Iniciar / cerrar sesión | Acceso con email y contraseña (Firebase Auth) | Lógica de negocio | Ambas |
| Unirse con código | Empleado se suma a una marca; admin aprueba | Lógica de negocio | Ambas |
| Control de acceso por rol | Dueño, admin, empleado, super admin | Lógica de negocio | Ambas |
| Dashboard / Inicio | KPIs del día y mes, accesos rápidos | Reporte | Ambas |
| ABM de productos | Alta, edición, baja/ocultar, importación (web) | ABM | Ambas (import web) |
| Registrar venta | Armado de ticket, medios de pago, descuentos | Lógica de negocio | Ambas |
| Borradores de venta | Guardar venta pendiente y retomar | Lógica de negocio | Ambas |
| Historial de ventas | Consulta y filtros; ticket PDF | Reporte | Ambas |
| Stock | Consulta, alertas bajo mínimo, movimientos | ABM / lógica | Ambas |
| Caja del día | Caja cambio, efectivo, ganancia, retiros, central | Lógica de negocio | Ambas |
| Clientes | Ficha y seguimiento de compras | ABM / reporte | Ambas |
| Presupuestos | Armado y export (plan Pro+) | Lógica / reporte | Ambas |
| Estadísticas | Gráficos y comparativas (plan Pro+) | Reporte | Ambas |
| Ajustes de marca | WhatsApp, pagos, Telegram, invitación | ABM | Ambas |
| Avisos Telegram | Notificaciones de ventas/cierres (Pro+) | Lógica de negocio | Backend |
| Panel de plataforma | Gestión de marcas (super admin) | ABM | Web |
| Planes de uso | Inicio / Pro / Empresa / A medida | Lógica de negocio | Web (landing) |
| Ventas offline (mobile) | Cola local y sync al reconectar | Lógica de negocio | Mobile |

### 2.3 Tecnología

| Ítem | Detalle |
|------|---------|
| Lenguaje | TypeScript |
| Web | React + Vite, HTML5, CSS |
| Mobile | React Native, Expo |
| Frameworks / libs | React Router, Recharts, Lucide, date-fns |
| Base de datos | Cloud Firestore (Firebase) |
| Autenticación | Firebase Authentication |
| Backend / jobs | Firebase Cloud Functions (Node) |
| Storage | Firebase Storage (imágenes / archivos) |
| Notificaciones | Telegram Bot API (secrets en Functions) |
| Deploy web | Vercel |
| Deploy mobile | Expo / EAS (APK) |
| Monorepo | `web/`, `mobile/`, `shared/`, `firebase/`, `functions/` |
| ORM | No aplica (SDK Firestore) |

### 2.4 Necesidades a satisfacer / Oportunidad

Los comercios chicos pierden control porque:

- El stock se lleva a mano o en Excel con diferencias frecuentes.  
- La caja no cierra con claridad (efectivo, retiros, cambio).  
- No hay trazabilidad de quién vendió y qué se movió.  
- El dueño no ve el día en tiempo real cuando no está en el local.

La oportunidad es ofrecer una herramienta **simple, mobile first y asequible** (con plan gratuito) que unifique mostrador, depósito y caja sin depender de planillas.

### 2.5 Beneficios esperados

| Ahora | Después (con Control+) |
|-------|-------------------------|
| Ventas y stock en planillas sueltas | Cada venta descuenta stock y queda registrada |
| Caja sin registro claro | Cierre con caja cambio, efectivo, ganancia y retiros |
| Sin info remota del día | Dashboard y avisos (Telegram en planes pagos) |
| Un solo dispositivo / sin roles | Web + celular, mismos datos; roles por plan |
| Sin comprobantes ordenados | Tickets, PDF y exports según plan |

### 2.6 Investigación de mercado

**Mercado:** comercios minoristas y mayoristas en Argentina que necesitan POS liviano + stock + caja, sin la complejidad ni el costo de ERPs.

| Competencia / alternativa | Qué ofrece | Control+ | Diferencia |
|---------------------------|------------|----------|------------|
| Planillas Excel / papel | Registro manual | Sistema integrado ventas–stock–caja | Menos error humano y tiempo de cierre |
| POS genéricos de caja | Cobro en mostrador | Stock, caja central, roles, multi-marca, Telegram | Enfoque integral y mobile first |
| Softwares contables pesados | Contabilidad y stock complejos | Flujo diario simple (vender / stock / caja) | Menor curva de aprendizaje y plan gratis |
| Solo WhatsApp / anotaciones | Informal | Historial, KPIs, presupuestos, exports | Trazabilidad y reportes |

**Validación:** marcas activas operando con el sistema (Advance Coat, SISMO, KELCOT).
