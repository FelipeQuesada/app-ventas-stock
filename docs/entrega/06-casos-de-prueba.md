# Casos de prueba — Control+

**Versión:** 1.0  
**Autor:** Felipe Quesada  
**Referencia:** [05-casos-de-uso.md](./05-casos-de-uso.md)

Convención: **P** = Pasó, **F** = Falló, **N/A** = No aplica. Completar columna Resultado en la ejecución real.

---

## CP-01 Login

| Campo | Valor |
|-------|-------|
| CU | CU0002 |
| Precondiciones | Usuario existente y activo |
| Pasos | 1. Abrir login 2. Ingresar email/clave correctos 3. Confirmar |
| Resultado esperado | Ingreso a Inicio / app |
| Resultado | |

| Campo | Valor |
|-------|-------|
| Variante | Credenciales inválidas |
| Resultado esperado | Mensaje de error; no ingresa |
| Resultado | |

---

## CP-02 Registro de dueño

| Campo | Valor |
|-------|-------|
| CU | CU0001 |
| Pasos | Completar registro y confirmar |
| Resultado esperado | Cuenta + marca creadas; puede loguearse |
| Resultado | |

---

## CP-03 Join + aprobación

| Campo | Valor |
|-------|-------|
| CU | CU0005 + CU0103 |
| Precondiciones | Invite code válido; usuario admin |
| Pasos | 1. Empleado se registra con código 2. Queda pendiente 3. Admin aprueba |
| Resultado esperado | Empleado puede operar |
| Resultado | |

---

## CP-04 Alta de producto

| Campo | Valor |
|-------|-------|
| CU | CU0101 |
| Pasos | Productos → Nuevo → cargar nombre, precio, stock → Guardar |
| Resultado esperado | Aparece en listado y en búsqueda de ventas |
| Resultado | |

---

## CP-05 Registrar venta y stock

| Campo | Valor |
|-------|-------|
| CU | CU0201 |
| Precondiciones | Producto con stock ≥ cantidad |
| Pasos | Ventas → agregar producto → pago → confirmar |
| Resultado esperado | Venta en historial; stock decrementado; ticket visible |
| Resultado | |

| Campo | Valor |
|-------|-------|
| Variante | Stock insuficiente |
| Resultado esperado | No confirma / aviso; stock intacto |
| Resultado | |

---

## CP-06 Borrador de venta

| Campo | Valor |
|-------|-------|
| CU | CU0202 |
| Pasos | Armar venta → guardar borrador → salir → retomar |
| Resultado esperado | Se recupera el borrador con ítems |
| Resultado | |

---

## CP-07 Caja del día

| Campo | Valor |
|-------|-------|
| CU | CU0205 |
| Precondiciones | Ventas en efectivo del día |
| Pasos | Abrir Caja → verificar efectivo/ganancia → retiro válido |
| Resultado esperado | Totales coherentes; retiro reflejado en caja central |
| Resultado | |

| Campo | Valor |
|-------|-------|
| Variante | Retiro mayor al disponible |
| Resultado esperado | Error / no permite |
| Resultado | |

---

## CP-08 Stock bajo

| Campo | Valor |
|-------|-------|
| CU | CU0204 / dashboard |
| Pasos | Dejar producto bajo mínimo; abrir Inicio / Productos filtro |
| Resultado esperado | Alerta o indicador de poco stock |
| Resultado | |

---

## CP-09 Roles

| Campo | Valor |
|-------|-------|
| CU | CU0301 |
| Pasos | Login como empleado; intentar acción solo admin (ej. usuarios) |
| Resultado esperado | Acceso denegado o UI no disponible |
| Resultado | |

---

## CP-10 Plan / feature flag

| Campo | Valor |
|-------|-------|
| CU | CU0503 |
| Precondiciones | Marca en plan Inicio |
| Pasos | Intentar estadísticas avanzadas / Telegram |
| Resultado esperado | Feature no disponible o bloqueada |
| Resultado | |

---

## CP-11 Offline mobile (si se prueba en dispositivo)

| Campo | Valor |
|-------|-------|
| CU | CU0501 |
| Pasos | Modo avión → registrar venta → reconectar |
| Resultado esperado | Venta pendiente luego sincronizada |
| Resultado | |

---

## CP-12 Super admin

| Campo | Valor |
|-------|-------|
| CU | CU0401 |
| Pasos | Login super admin → panel marcas |
| Resultado esperado | Lista de marcas; puede entrar/gestionar |
| Resultado | |

---

## Resumen de ejecución

| ID | Nombre | Fecha | Tester | P/F |
|----|--------|-------|--------|-----|
| CP-01 | Login | | | |
| CP-02 | Registro | | | |
| CP-03 | Join | | | |
| CP-04 | Producto | | | |
| CP-05 | Venta | | | |
| CP-06 | Borrador | | | |
| CP-07 | Caja | | | |
| CP-08 | Stock bajo | | | |
| CP-09 | Roles | | | |
| CP-10 | Plan | | | |
| CP-11 | Offline | | | |
| CP-12 | Super admin | | | |
