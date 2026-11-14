# Inventario de Requerimientos Funcionales y No Funcionales — Control+

## Historial de versiones

| Versión | Fecha | Descripción | Autor |
|---------|-------|-------------|-------|
| 1.0 | 2026-11 | Versión inicial alineada al sistema en producción | Felipe Quesada |

---

## 1. Objetivo

Control+ es un sistema de software para comercios que permite **vender, controlar stock y cerrar caja** desde web y celular, con datos sincronizados en tiempo real, roles por marca y planes de uso.

## 2. Beneficios

- Menos dependencia de planillas.  
- Stock actualizado con cada venta.  
- Cierre de caja trazable (efectivo, retiros, caja central).  
- Visibilidad del día para el dueño (dashboard / Telegram).  
- Equipo con roles e invitaciones (planes Pro+).  
- Plan gratuito para empezar (Inicio).

## 3. Alcance

**Incluye:** autenticación; multi-marca; productos; ventas y borradores; stock; caja; clientes; presupuestos y estadísticas según plan; avisos Telegram; exports; app mobile con ventas offline; landing y presentación web.

**Usuarios:** dueño (owner), admin de marca, empleado, super admin de plataforma.

## 4. Limitaciones

- No es un sistema contable completo ni liquidación impositiva AFIP integrada.  
- Pasarelas de cobro externas (Mercado Pago checkout embebido completo) no son el foco del MVP documentado; se registran medios de pago.  
- La cola offline aplica a **mobile**, no a web.  
- Algunas features (Flex, Telegram, presupuestos, multi-usuario) dependen del **plan**.  
- Tiendanube: integración preparada/limitada según flags de plan (no como promesa comercial principal).

## 5. Requisitos no funcionales globales

| ID | Requisito | Descripción |
|----|-----------|-------------|
| RNF-01 | Seguridad | Firebase Auth; reglas Firestore por usuario/rol/marca; secrets de Telegram fuera del repo |
| RNF-02 | Multi-tenant | Aislamiento de datos por `brandId` |
| RNF-03 | Disponibilidad | Backend gestionado (Firebase); web en Vercel |
| RNF-04 | Sincronización | Datos en tiempo real entre web y mobile |
| RNF-05 | Offline mobile | Ventas encoladas y sync al recuperar red |
| RNF-06 | Usabilidad | Mobile first; flujos de venta con pocos toques |
| RNF-07 | Performance | Listados con búsqueda/filtros; dashboards livianos |
| RNF-08 | Portabilidad | Web en navegadores modernos; APK Android vía Expo |
| RNF-09 | Mantenibilidad | Monorepo con `shared/` de tipos y reglas de negocio |
| RNF-10 | Privacidad | Políticas legales en la web; datos operativos del comercio |

---

## 6. Módulos

### 6.1 Autenticación y usuarios

**RF:** registro, login, logout, join, aprobación, roles, perfil.  
**RNF:** tokens Auth; cuentas inactivas / pendientes no operan.

### 6.2 Productos y stock

**RF:** ABM productos, import web, alertas stock bajo, movimientos depósito/central.  
**RNF:** consistencia stock tras venta; imágenes vía Storage cuando aplica.

### 6.3 Ventas

**RF:** alta de venta, borradores, historial, ticket/PDF, descuentos, medios de pago.  
**RNF:** descuento de stock atómico lógico; offline queue en mobile.

### 6.4 Caja

**RF:** caja del día, retiros, agregar dinero, historial, ediciones.  
**RNF:** trazabilidad de quién cerró / retiró; WhatsApp de marca en mensajes.

### 6.5 Clientes y presupuestos

**RF:** ficha cliente; presupuestos y listados (Pro+).  
**RNF:** exports legibles para el comercio.

### 6.6 Reportes y estadísticas

**RF:** KPIs, gráficos, estadísticas de período, Excel/PDF.  
**RNF:** solo habilitados según `planId`.

### 6.7 Marca y plataforma

**RF:** ajustes marca, Telegram, panel super admin, landing/planes.  
**RNF:** secrets en Cloud Functions; email de super admin en reglas.

### 6.8 Notificaciones

**RF:** avisos Telegram de eventos relevantes.  
**RNF:** token nunca en el cliente; opt-in por marca.

---

## 7. Prototipos de interfaz

- App real en producción / staging.  
- Capturas en presentación (`/presentacion`, pantallas Inicio, Ventas, Productos, Caja).  
- Landing comercial con demos interactivas.

## 8. Glosario

| Término | Definición |
|---------|------------|
| Marca / Brand | Tenant: comercio o empresa que opera en Control+ |
| Dueño / Owner | Rol con control total de la marca |
| Admin | Rol de administración dentro de la marca |
| Empleado | Rol operativo limitado |
| Super admin | Rol de plataforma sobre todas las marcas |
| Caja cambio | Efectivo inicial del día |
| Caja central | Pozo acumulado de lo guardado menos retiros |
| Borrador | Venta guardada sin confirmar cobro |
| Invite code | Código para que un empleado se una a la marca |
| Plan | Paquete de límites/features (Inicio, Pro, Empresa, A medida) |
