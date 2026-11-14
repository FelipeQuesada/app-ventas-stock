# Casos de uso — Control+

**Autor:** Felipe Quesada  
**Versión:** 1.0  

---

## 1. Introducción

Este documento describe los casos de uso de Control+. Representan las interacciones entre usuarios (actores) y el sistema para ventas, stock, caja y administración de marca.

### 1.1 Objetivo

Especificar acciones por rol y la respuesta esperada del sistema, como base para diseño, implementación y casos de prueba.

### 1.2 Actores

| Actor | Descripción |
|-------|-------------|
| Visitante | Usuario no autenticado (landing, login, registro) |
| Dueño | Owner de la marca |
| Admin | Administrador de marca |
| Empleado | Operador con permisos limitados |
| Super admin | Administrador de plataforma |
| Sistema | Procesos automáticos (sync offline, Telegram, reglas) |

---

## 2. Casos de uso compartidos (usuarios autenticados de marca)

### CU0001 – Registrarse (dueño)

- **Actores:** Visitante  
- **Entrada:** Accede a registro y completa datos de cuenta/marca  
- **Salida:** Cuenta creada; puede iniciar sesión como dueño  
- **Flujo básico:** 1) Abrir registro 2) Completar formulario 3) Confirmar 4) Sistema crea Auth + perfil + marca  
- **Alternativo:** Datos inválidos → mensajes de error  

### CU0002 – Iniciar sesión

- **Actores:** Dueño, Admin, Empleado, Super admin  
- **Entrada:** Email y contraseña  
- **Salida:** Sesión iniciada; redirección a app o panel  
- **Flujo básico:** 1) Login 2) Validar Auth 3) Cargar perfil y marca  
- **Alternativo:** Credenciales incorrectas; marca suspendida; empleado pendiente  

### CU0003 – Cerrar sesión

- **Actores:** Usuario autenticado  
- **Salida:** Sesión finalizada; pantalla de login  

### CU0004 – Editar perfil

- **Actores:** Usuario autenticado  
- **Salida:** Datos de perfil actualizados  

### CU0005 – Unirse a una marca (join)

- **Actores:** Visitante / nuevo usuario  
- **Entrada:** Código de invitación  
- **Salida:** Usuario pendiente de aprobación o activo según reglas  
- **Alternativo:** Código inválido  

---

## 3. Casos de uso del dueño / admin

### CU0101 – Gestionar productos

- **Entrada:** Pantalla Productos  
- **Salida:** Producto creado, editado o eliminado/oculto  
- **Flujo:** Listar → Nuevo/Editar → Guardar; o Eliminar con confirmación  
- **Alternativo:** Validación de campos; sin stock suficiente en venta  

### CU0102 – Importar productos (web)

- **Entrada:** Archivo de importación  
- **Salida:** Productos cargados/actualizados  

### CU0103 – Aprobar empleados

- **Entrada:** Lista de pendientes  
- **Salida:** Empleado activo o rechazado  

### CU0104 – Configurar marca

- **Entrada:** Ajustes (WhatsApp, pagos, Telegram, invite)  
- **Salida:** Configuración persistida  

### CU0105 – Consultar estadísticas

- **Precondición:** Plan con estadísticas  
- **Salida:** Métricas y gráficos del período  

### CU0106 – Emitir presupuesto

- **Precondición:** Plan Pro+  
- **Salida:** Presupuesto guardado / exportado  

### CU0107 – Exportar reportes

- **Salida:** Archivo Excel/PDF según módulo  

---

## 4. Casos de uso operativos (dueño, admin, empleado según permisos)

### CU0201 – Registrar venta

- **Entrada:** Pantalla Registrar venta  
- **Salida:** Venta confirmada; stock descontado; ticket disponible  
- **Flujo básico:**  
  1. Elegir fecha / vendedor  
  2. Datos de cliente (opcional)  
  3. Buscar y agregar productos  
  4. Definir pago(s) y descuentos  
  5. Confirmar  
- **Alternativo:** Stock insuficiente; pago incompleto; guardar como borrador  

### CU0202 – Gestionar borradores

- **Salida:** Borrador guardado, retomado o descartado  

### CU0203 – Consultar historial de ventas

- **Salida:** Listado filtrado; detalle / ticket  

### CU0204 – Consultar / ajustar stock

- **Salida:** Stock actualizado con motivo  

### CU0205 – Operar caja del día

- **Entrada:** Caja del día  
- **Salida:** Valores de cambio, efectivo, ganancia; retiros o ingresos registrados  
- **Flujo:** Ver resumen → Ajustar caja cambio → Agregar/retirar → Confirmar  
- **Alternativo:** Monto de retiro inválido; sin permisos  

### CU0206 – Gestionar clientes

- **Salida:** Alta/consulta de cliente y su historial  

---

## 5. Casos de uso del empleado

Además de CU0002–CU0004 y los operativos habilitados:

### CU0301 – Operar con permisos limitados

- Puede registrar ventas y consultar lo autorizado.  
- No administra usuarios ni (según config) precios/stock sensible.  

### CU0302 – Esperar aprobación

- Tras join, permanece en estado pending hasta CU0103.  

---

## 6. Casos de uso del super admin

### CU0401 – Gestionar marcas (plataforma)

- Listar / crear / suspender / ajustar plan de marcas.  

### CU0402 – Entrar a una marca

- Override de contexto de marca para soporte/operación.  

---

## 7. Casos de uso del sistema

### CU0501 – Sincronizar ventas offline (mobile)

- Al recuperar red, envía cola pendiente y actualiza UI.  

### CU0502 – Enviar aviso Telegram

- Ante eventos configurados, Functions notifica al chat de la marca.  

### CU0503 – Aplicar límites de plan

- Habilita/deshabilita features según `planId`.  
