# UML — Control+

**Versión:** 1.0  
**Autor:** Felipe Quesada  

Los diagramas están en Mermaid. Exportá a PNG en https://mermaid.live para pegarlos en Google Docs.

---

## 1. Diagrama de casos de uso (resumen)

```mermaid
flowchart LR
  visitante[Visitante]
  dueno[Dueno]
  admin[Admin]
  empleado[Empleado]
  superAdmin[SuperAdmin]
  sistema[Sistema]

  visitante --> registro[Registrarse]
  visitante --> login[IniciarSesion]
  visitante --> join[UnirseConCodigo]

  dueno --> productos[GestionarProductos]
  dueno --> usuarios[AprobarEmpleados]
  dueno --> ajustes[ConfigurarMarca]
  dueno --> stats[Estadisticas]
  admin --> productos
  admin --> usuarios
  admin --> ajustes

  empleado --> venta[RegistrarVenta]
  empleado --> caja[OperarCaja]
  dueno --> venta
  admin --> venta
  dueno --> caja
  admin --> caja

  superAdmin --> marcas[GestionarMarcas]

  sistema --> sync[SyncOffline]
  sistema --> telegram[AvisosTelegram]
```

---

## 2. Diagrama de clases / dominio (simplificado)

```mermaid
classDiagram
  class Brand {
    +string id
    +string name
    +string slug
    +string ownerUid
    +PlanId planId
    +string inviteCode
    +string whatsapp
    +string telegramChatId
  }

  class UserProfile {
    +string uid
    +string email
    +string name
    +UserRole role
    +string brandId
    +boolean active
    +boolean pendingApproval
  }

  class Product {
    +string id
    +string name
    +string category
    +number price
    +number stock
    +boolean hidden
  }

  class Sale {
    +string id
    +SaleItem[] items
    +number total
    +PaymentMethod payment
    +Date createdAt
    +string brandId
  }

  class SaleItem {
    +string productId
    +number quantity
    +number unitPrice
  }

  class DailyCaja {
    +string date
    +number cajaCambio
    +number cashSales
    +number totalGuardado
  }

  class SaleDraft {
    +string id
    +SaleItem[] items
    +string brandId
  }

  Brand "1" --> "*" UserProfile : tiene
  Brand "1" --> "*" Product : catalogo
  Brand "1" --> "*" Sale : ventas
  Brand "1" --> "*" DailyCaja : cierres
  Brand "1" --> "*" SaleDraft : borradores
  Sale "1" --> "*" SaleItem : lineas
  SaleItem --> Product : referencia
```

---

## 3. Diagrama de secuencia — Registrar venta

```mermaid
sequenceDiagram
  actor U as Usuario
  participant App as Web_o_Mobile
  participant Auth as FirebaseAuth
  participant DB as Firestore
  participant Fn as CloudFunctions

  U->>App: Confirmar venta
  App->>Auth: Usuario autenticado
  App->>DB: Crear Sale + actualizar stock
  DB-->>App: OK
  opt Plan con Telegram
    DB->>Fn: Trigger / llamada
    Fn->>Fn: Enviar aviso Telegram
  end
  App-->>U: Ticket / confirmacion
```

---

## 4. Diagrama de estados — Empleado (join)

```mermaid
stateDiagram-v2
  [*] --> RegistradoConCodigo
  RegistradoConCodigo --> PendingApproval: envia solicitud
  PendingApproval --> Activo: admin aprueba
  PendingApproval --> Rechazado: admin rechaza
  Activo --> [*]
  Rechazado --> [*]
```
