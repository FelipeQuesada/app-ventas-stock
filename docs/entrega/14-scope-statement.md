# Declaración de alcance del proyecto — Control+

**Proyecto:** Control+ — Sistema de ventas, stock y caja  
**Alumno:** Felipe Quesada  
**Fecha de envío:** _(completar)_  
**Versión:** 1.0  

---

## Objetivos del proyecto

Desarrollar y poner en producción un sistema web y móvil que permita a comercios registrar ventas, controlar stock y cerrar caja, con autenticación, roles, multi-marca y planes de uso, validado con marcas reales y documentado como Trabajo Final de carrera.

---

## Paso 1. Entregables del proyecto

| Nº | Descripción |
|----|-------------|
| 1 | Aplicación web en producción (controlmas.com.ar) |
| 2 | Aplicación móvil Android (APK Expo) |
| 3 | Backend Firebase (Auth, Firestore, Functions, Rules) |
| 4 | Documentación académica (propuesta, RF, CU, pruebas, UML, DER, arquitectura, componentes, Gantt, manual) |
| 5 | Plan de negocio y declaración de alcance |
| 6 | Presentación de tesis (web `/presentacion` + PDF) |
| 7 | Landing comercial con planes |

---

## Paso 2. Lista de tareas del proyecto

| Nº | Descripción | Entregable |
|----|-------------|------------|
| 1 | Relevamiento de problema y alcance | 4, 5 |
| 2 | Diseño RF/RNF, casos de uso y modelo de datos | 4 |
| 3 | Implementación auth, productos, ventas, stock, caja (web) | 1 |
| 4 | Paridad mobile + offline de ventas | 2 |
| 5 | Multi-marca, roles, join/aprobación, planes | 1, 2, 3 |
| 6 | Telegram, exports, presupuestos, estadísticas | 1, 2, 3 |
| 7 | Landing, legal, presentación | 6, 7 |
| 8 | Pruebas funcionales y correcciones | 1, 2, 4 |
| 9 | Deploy Vercel + Firebase + dominio | 1, 3 |
| 10 | Redacción de documentación de entrega | 4, 5 |

**WBS adjunta:** No (esta declaración + Gantt en [12-gantt.md](./12-gantt.md)).

---

## Paso 3. Fuera del alcance

Este proyecto **NO** incluye:

- Contabilidad impositiva completa / liquidación AFIP automática.  
- Facturación electrónica homologada como módulo principal.  
- App iOS publicada en App Store (foco Android/APK).  
- ERP de compras a proveedores multi-sucursal complejo.  
- Marketplace público entre comercios.  
- Rediseño total de MiTaller u otros productos previos.

---

## Paso 4. Supuestos del proyecto

| Nº | Presunción |
|----|------------|
| 1 | Firebase y Vercel permanecen disponibles y dentro de cuotas razonables |
| 2 | Los comercios piloto cargan datos reales para validar |
| 3 | Los usuarios tienen smartphone Android o acceso web |
| 4 | El alcance de planes comerciales puede ajustarse sin cambiar el núcleo funcional |
| 5 | Un desarrollador (el alumno) mantiene el producto durante el TF |

---

## Paso 5. Restricciones del proyecto

| Tipo | Detalle |
|------|---------|
| Fechas | Calendario de entrega del Seminario / TF _(completar fechas cátedra)_ |
| Presupuesto | Costos cloud en capa gratuita/pago bajo; sin equipo de desarrollo externo |
| Calidad | Flujos críticos (venta, stock, caja, login) deben funcionar en producción |
| Equipo | Un integrante principal (Felipe Quesada) |
| Regulatorias | Cumplir buenas prácticas de privacidad; textos legales en la web |

---

## Paso 6. Estimaciones actualizadas

| Concepto | Estimación |
|----------|------------|
| Horas totales orientativas del TF | 400–600 h (análisis + diseño + desarrollo + docs) |
| Observación | Trabajo acumulado a lo largo de la cursada y puesta en producción |

---

## Paso 7. Aprobaciones

| Nombre y título | Rol | Fecha presentación | Fecha aprobación |
|-----------------|-----|--------------------|------------------|
| Felipe Quesada | Autor / alumno | | |
| _(Docente / tutor)_ | Aprobador académico | | |
