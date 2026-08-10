/**
 * Script para crear el primer usuario admin.
 * Requiere credenciales de Firebase Admin o ejecutar manualmente desde la consola.
 *
 * Pasos manuales recomendados:
 * 1. Firebase Console → Authentication → Add user (email + password)
 * 2. Firestore → Crear documento en colección "users" con ID = uid del usuario:
 *    { email, name: "Admin", role: "admin", createdAt: timestamp }
 */

console.log(`
=== Advance Coat - Setup de usuario ===

1. Creá un usuario en Firebase Authentication (email/password)
2. Copiá el UID del usuario
3. En Firestore, creá el documento users/{uid} con:
   - email: "admin@advancecoat.com"
   - name: "Administrador"
   - role: "admin"
   - createdAt: (timestamp actual)

4. Completá el archivo .env con las credenciales de Firebase
5. Ejecutá: npx expo start
`);
