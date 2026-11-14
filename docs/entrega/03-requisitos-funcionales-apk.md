# Requisitos funcionales — APK / Mobile (Control+)

**Versión:** 1.0  
**Autor:** Felipe Quesada  
**Alcance:** aplicación móvil Android (Expo / React Native), mismos datos que la web vía Firebase.

---

## Autenticación y onboarding

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-M-01 | Login | Email y contraseña | Lógica de negocio |
| RF-M-02 | Registro dueño | Crear cuenta y marca | ABM |
| RF-M-03 | Join | Unirse con código de invitación | Lógica de negocio |
| RF-M-04 | Pending | Pantalla de espera de aprobación | Lógica de negocio |
| RF-M-05 | Logout | Cerrar sesión | Lógica de negocio |
| RF-M-06 | Perfil | Datos de usuario y navegación a ajustes | ABM |

## Navegación principal (tabs)

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-M-10 | Inicio | KPIs, gráfico (si aplica), accesos rápidos | Reporte |
| RF-M-11 | Ventas | Flujo de registrar venta | Lógica de negocio |
| RF-M-12 | Productos | Listado y gestión básica | ABM / reporte |
| RF-M-13 | Caja | Caja del día | Lógica de negocio |
| RF-M-14 | Más / perfil | Acceso a stock, clientes, historiales, ajustes | Lógica de negocio |

## Ventas y offline

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-M-20 | Registrar venta | Búsqueda, categorías, pagos, cliente, vendedor | Lógica de negocio |
| RF-M-21 | Borradores | Guardar / listar / retomar borradores | Lógica de negocio |
| RF-M-22 | Ticket | Vista de comprobante post-venta | Reporte |
| RF-M-23 | Ventas offline | Encolar venta sin red y sincronizar al reconectar | Lógica de negocio |
| RF-M-24 | Historial de ventas | Consulta de ventas guardadas | Reporte |

## Productos y stock

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-M-30 | Listar productos | Búsqueda y filtros | Reporte |
| RF-M-31 | Alta / edición | Formulario de producto | ABM |
| RF-M-32 | Stock | Consulta y movimientos | ABM / lógica |

## Caja, clientes y extras

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-M-40 | Caja del día | Mismos conceptos que web (cambio, efectivo, retiros) | Lógica de negocio |
| RF-M-41 | Historial / editar caja | Pantallas asociadas | ABM / reporte |
| RF-M-50 | Clientes | Listado y detalle | ABM / reporte |
| RF-M-60 | Presupuesto | Armado y listado (si el plan lo habilita) | Lógica / reporte |
| RF-M-70 | Estadísticas | Pantalla de métricas (plan Pro+) | Reporte |
| RF-M-80 | Brand settings | Ajustes de marca (WhatsApp, Telegram, invite) | ABM |
| RF-M-81 | Usuarios | Gestión / pendientes (admin) | ABM |

## Diferencias respecto a Web

| Tema | Mobile | Web |
|------|--------|-----|
| Importación masiva de productos | No | Sí |
| Panel super admin / plataforma | No | Sí |
| Landing, legal, presentación | No | Sí |
| Layout desktop (ventas/caja) | N/A | Sí |
| Cola offline de ventas | Sí | No (requiere red) |
| UX mobile first / tabs | Sí | Bottom nav / sidebar según viewport |
