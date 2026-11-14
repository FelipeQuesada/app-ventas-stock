# Requisitos funcionales — Web (Control+)

**Versión:** 1.0  
**Autor:** Felipe Quesada  
**Alcance:** aplicación web (navegador) en https://controlmas.com.ar  

---

## Autenticación y cuenta

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-01 | Registro | Crear cuenta de dueño y marca asociada | ABM |
| RF-W-02 | Login | Acceso con email y contraseña | Lógica de negocio |
| RF-W-03 | Logout | Cerrar sesión | Lógica de negocio |
| RF-W-04 | Join con código | Empleado se une a una marca con invite code | Lógica de negocio |
| RF-W-05 | Aprobar / rechazar empleados | Admin aprueba pendientes | Lógica de negocio |
| RF-W-06 | Perfil | Ver y actualizar datos básicos; cambio de contraseña | ABM |

## Dashboard e inicio

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-10 | KPIs | Ventas de hoy, recaudación del mes, ticket promedio, productos / stock bajo | Reporte |
| RF-W-11 | Gráfico 30 días | Recaudación diaria (admin / plan con estadísticas) | Reporte |
| RF-W-12 | Accesos rápidos | Atajos a venta, productos, clientes, caja, etc. | Lógica de negocio |
| RF-W-13 | Alerta stock bajo | Aviso cuando hay productos bajo mínimo | Reporte |

## Productos

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-20 | Listar / buscar / filtrar | Catálogo con búsqueda y categorías; sin stock / poco stock | Reporte |
| RF-W-21 | Alta / edición | Crear y modificar productos (precio, stock, categoría, imagen) | ABM |
| RF-W-22 | Eliminar / ocultar | Baja o ocultar del catálogo | ABM |
| RF-W-23 | Importar productos | Carga masiva desde archivo (web) | ABM |
| RF-W-24 | Agregar a venta | Desde listado, sumar producto al carrito/venta | Lógica de negocio |

## Ventas

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-30 | Registrar venta | Armar ítems, medios de pago, cliente, vendedor, descuentos | Lógica de negocio |
| RF-W-31 | Borradores | Guardar y retomar ventas pendientes | Lógica de negocio |
| RF-W-32 | Historial | Listar, filtrar y consultar ventas | Reporte |
| RF-W-33 | Ticket / PDF | Comprobante con nombre de marca | Reporte |
| RF-W-34 | Editar venta | Corrección de venta existente (según permisos) | ABM |

## Stock

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-40 | Consultar stock | Ver unidades y estado | Reporte |
| RF-W-41 | Ajustes / movimientos | Entradas, salidas, depósito ↔ central con motivo | Lógica de negocio |

## Caja

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-50 | Caja del día | Caja cambio, ventas efectivo, total, ganancia | Lógica de negocio |
| RF-W-51 | Agregar / retirar | Movimientos de efectivo y caja central | Lógica de negocio |
| RF-W-52 | Historial de cajas | Consulta de cierres previos | Reporte |
| RF-W-53 | Registrar / editar caja | Cargas y correcciones de fechas | ABM |

## Clientes, presupuestos y estadísticas

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-60 | Clientes | Listado y detalle de compras | ABM / reporte |
| RF-W-70 | Presupuestos | Armar, listar y exportar (plan Pro+) | Lógica / reporte |
| RF-W-80 | Estadísticas | Métricas y gráficos del período (plan Pro+) | Reporte |
| RF-W-81 | Exports | Excel / PDF de ventas, caja, etc. (según plan) | Reporte |

## Marca, roles y plataforma

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-90 | Ajustes de marca | Nombre, WhatsApp, pagos, Telegram, invite | ABM |
| RF-W-91 | Usuarios de la marca | Alta, roles, activación | ABM |
| RF-W-92 | Panel plataforma | Super admin gestiona marcas | ABM |
| RF-W-93 | Landing / planes | Información comercial y registro | Reporte / lógica |
| RF-W-94 | Presentación | Diapositivas de tesis en `/presentacion` | Reporte |
| RF-W-95 | Legal | Términos, privacidad, cookies, contacto | Reporte |

## Flex (plan Empresa)

| ID | Funcionalidad | Descripción | Tipificación |
|----|---------------|-------------|--------------|
| RF-W-100 | Módulo Flex | Gestión de envíos / etiquetas según plan Empresa | Lógica / reporte |
