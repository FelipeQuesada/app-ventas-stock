/**
 * Sella brandId: 'advance-coat' en docs/usuarios legacy sin marca.
 * Uso: node scripts/seal-advance-brandId.mjs
 * Requiere: firebase login + permisos en el proyecto.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT = 'advancecoat-ventas-stock';
const BRAND = 'advance-coat';
const COLLECTIONS = [
  'products',
  'sales',
  'saleDrafts',
  'caja',
  'cajaCentral',
  'cajaCentralMovements',
  'customers',
  'presupuestos',
  'flexShipments',
  'auditLogs',
];

function needsBrandId(value) {
  return value === undefined || value === null || value === '';
}

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT,
});

const db = getFirestore();

async function sealCollection(name) {
  const snap = await db.collection(name).get();
  let batch = db.batch();
  let ops = 0;
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!needsBrandId(data.brandId)) continue;
    batch.update(doc.ref, { brandId: BRAND });
    ops += 1;
    updated += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { total: snap.size, updated };
}

async function sealUsers() {
  const brands = new Set((await db.collection('brands').get()).docs.map((d) => d.id));
  const snap = await db.collection('users').get();
  let batch = db.batch();
  let ops = 0;
  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.role === 'super_admin') continue;
    const current = data.brandId;
    const missing = needsBrandId(current);
    const orphan =
      typeof current === 'string' &&
      current.length > 0 &&
      current !== BRAND &&
      !brands.has(current);
    if (!missing && !orphan) continue;
    batch.update(doc.ref, { brandId: BRAND });
    ops += 1;
    updated += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return { total: snap.size, updated };
}

async function main() {
  console.log('Proyecto', PROJECT);
  for (const col of COLLECTIONS) {
    try {
      const r = await sealCollection(col);
      console.log(`${col}: ${r.updated}/${r.total} sellados`);
    } catch (err) {
      console.warn(`${col}: ERROR`, err.message || err);
    }
  }
  try {
    const r = await sealUsers();
    console.log(`users: ${r.updated}/${r.total} sellados`);
  } catch (err) {
    console.warn('users: ERROR', err.message || err);
  }
  console.log('Listo');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
