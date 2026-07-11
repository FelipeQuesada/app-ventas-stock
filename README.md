# Advance Coat — App de Ventas (Showroom)

Aplicación interna para registrar ventas, gestionar productos, controlar stock y ver estadísticas. Desarrollada con **Expo** y **Firebase**.

## Características

- Login con Firebase Auth (recuperación de contraseña)
- Dashboard con métricas del día y del mes
- Registro de ventas con múltiples productos y formas de pago
- Gestión de productos con foto, categoría, precio y stock
- Control de stock por categorías con indicadores visuales
- Estadísticas con gráficos de barras, líneas y torta
- Perfil de usuario con cambio de contraseña
- Roles: empleado y admin (mismos permisos por ahora)
- Diseño minimalista optimizado para tablet

## Requisitos

- Node.js 18+
- Cuenta de Firebase
- Expo Go o build de desarrollo en dispositivo/tablet

## Configuración de Firebase

1. Creá un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilitá **Authentication** → Email/Password
3. Creá una base de datos **Firestore**
4. Habilitá **Storage** para fotos de productos
5. Copiá `.env.example` a `.env` y completá las credenciales:

```bash
cp .env.example .env
```

6. Desplegá las reglas de seguridad desde `firebase/firestore.rules` y `firebase/storage.rules`

### Crear el primer usuario

Desde Firebase Console → Authentication → Add user, o ejecutá en consola del proyecto:

```js
// Crear usuario y perfil manualmente en Firestore
// Colección: users/{uid}
// Campos: email, name, role ("admin" | "employee"), createdAt
```

## Instalación

```bash
npm install
npx expo start
```

Escaneá el QR con Expo Go o presioná `a` para Android / `i` para iOS.

## Estructura del proyecto

```
app/
  (auth)/login.tsx       → Pantalla de login
  (tabs)/                → Navegación principal
    index.tsx            → Dashboard
    sales.tsx            → Registrar venta
    products.tsx         → Lista de productos
    statistics.tsx       → Estadísticas
    profile.tsx          → Perfil
  product/[id].tsx       → Agregar/editar producto
  stock.tsx              → Control de stock
components/              → UI reutilizable
services/                → Lógica Firebase
constants/               → Tema, categorías, pagos
```

## Formas de pago

Efectivo, Transferencia, Débito, Crédito, Mercado Pago

## Colecciones Firestore

| Colección  | Descripción                          |
|-----------|--------------------------------------|
| `users`   | Perfiles de empleados y admins       |
| `products`| Catálogo con stock y precios         |
| `sales`   | Ventas registradas con ítems         |

## Tecnologías

- Expo SDK 57 + Expo Router
- React Native
- Firebase (Auth, Firestore, Storage)
- react-native-gifted-charts
- Inter (tipografía)
- Material Icons
