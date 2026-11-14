# DER — Modelo de datos (Control+)

**Versión:** 1.0  
**Autor:** Felipe Quesada  
**Nota:** Firestore es NoSQL orientado a documentos. Este DER lógico muestra entidades y relaciones equivalentes para la entrega académica.

---

## 1. Diagrama entidad-relación lógico

```mermaid
erDiagram
  BRANDS ||--o{ USERS : "brandId"
  BRANDS ||--o{ PRODUCTS : "brandId"
  BRANDS ||--o{ SALES : "brandId"
  BRANDS ||--o{ SALE_DRAFTS : "brandId"
  BRANDS ||--o{ DAILY_CAJA : "brandId"
  BRANDS ||--o{ CUSTOMERS : "brandId"
  BRANDS ||--o{ PRESUPUESTOS : "brandId"
  SALES ||--|{ SALE_ITEMS : "contiene"
  PRODUCTS ||--o{ SALE_ITEMS : "productId"
  CUSTOMERS ||--o{ SALES : "opcional"

  BRANDS {
    string id PK
    string name
    string slug
    string ownerUid
    string planId
    string status
    string inviteCode
    string whatsapp
    string telegramChatId
    boolean telegramEnabled
  }

  USERS {
    string uid PK
    string email
    string name
    string role
    string brandId FK
    boolean active
    boolean pendingApproval
  }

  PRODUCTS {
    string id PK
    string brandId FK
    string name
    string category
    number price
    number stock
    boolean hidden
  }

  SALES {
    string id PK
    string brandId FK
    number total
    string paymentMethod
    string sellerName
    string customerPhone
    timestamp createdAt
  }

  SALE_ITEMS {
    string saleId FK
    string productId FK
    number quantity
    number unitPrice
  }

  SALE_DRAFTS {
    string id PK
    string brandId FK
    string userId
    timestamp updatedAt
  }

  DAILY_CAJA {
    string id PK
    string brandId FK
    string date
    number cajaCambio
    number cashSales
    number totalGuardado
    string closedByName
  }

  CUSTOMERS {
    string id PK
    string brandId FK
    string name
    string phone
    string email
  }

  PRESUPUESTOS {
    string id PK
    string brandId FK
    number total
    timestamp createdAt
  }
```

---

## 2. Colecciones Firestore (orientativo)

| Colección / path | Contenido |
|------------------|-----------|
| `brands` | Marcas (tenants) |
| `users` | Perfiles (rol, brandId, pending) |
| `brands/{brandId}/products` o colección con `brandId` | Productos |
| ventas / sales | Ventas y líneas |
| saleDrafts | Borradores |
| dailyCaja / caja | Cierres diarios |
| customers | Clientes |
| presupuestos | Presupuestos |
| audit / logs | Auditoría (si aplica) |

> Los paths exactos siguen la implementación en `web/src/services/*` y `mobile/services/*`. El aislamiento se refuerza con **reglas de Firestore** por `brandId` y rol.

---

## 3. Cardinalidades clave

- Una **marca** tiene muchos **usuarios**, **productos** y **ventas**.  
- Una **venta** tiene una o muchas **líneas**; cada línea referencia un producto.  
- Un **día** tiene un registro de **caja** por marca.  
- Un usuario empleado pertenece a **una** marca; el super admin puede no tener `brandId`.
