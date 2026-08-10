/**
 * Valida el parseo del export de Tienda Nube.
 * Uso: node scripts/validate-import.mjs
 */
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, 'data', 'productos-tiendanube.csv');

const workbook = XLSX.read(fs.readFileSync(csvPath), { type: 'buffer', FS: ';' });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

function parsePrice(value) {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value == null || value === '') return null;
  let text = String(value).trim().replace(/[$\s]/g, '');
  if (!text) return null;
  if (/,/.test(text) && /\.\d{3}/.test(text)) text = text.replace(/\./g, '').replace(',', '.');
  else if (/,/.test(text)) text = text.replace(',', '.');
  else text = text.replace(/(\d)\.(?=\d{3}(\D|$))/g, '$1');
  const parsed = Number.parseFloat(text);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseCategoryValue(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  const firstCategory = value.split(',')[0].trim();
  return firstCategory.includes('>') ? firstCategory.split('>').pop().trim() : firstCategory;
}

function inferCategoryFromName(name) {
  const lower = name.toLowerCase();
  if (lower.includes('molde')) return 'Moldes de Silicona';
  if (lower.includes('resina')) return 'Resinas Epoxi';
  if (lower.includes('combo')) return 'Combos';
  if (lower.includes('pigmento') || lower.includes('glitter')) return 'Pigmentos';
  if (lower.includes('curso') || lower.includes('taller')) return 'Cursos de Resina Epoxi';
  return '';
}

function resolveSalePrice(regularRaw, promoRaw) {
  const regular = parsePrice(regularRaw);
  const promotional = parsePrice(promoRaw);
  if (promotional != null && promotional > 1 && regular != null && promotional < regular) {
    return promotional;
  }
  return regular;
}

let parentName = '';
let parentCategory = '';
const products = [];

for (const row of rows) {
  const nameValue = String(row.Nombre ?? '').trim();
  const isVariantRow = !nameValue;

  if (nameValue) {
    parentName = nameValue;
    parentCategory = parseCategoryValue(row.Categorías) || inferCategoryFromName(nameValue);
  }

  if (!parentName) continue;

  const variantValues = [1, 2, 3]
    .map((index) => String(row[`Valor de propiedad ${index}`] ?? '').trim())
    .filter(Boolean);
  const name = variantValues.length
    ? `${parentName} - ${variantValues.join(' / ')}`
    : parentName;
  const category =
    parseCategoryValue(row.Categorías) ||
    (isVariantRow ? parentCategory : inferCategoryFromName(parentName)) ||
    parentCategory ||
    'Sin categoría';
  const price = resolveSalePrice(row.Precio, row['Precio promocional']);
  const stock = Number.parseInt(String(row.Stock ?? '0').replace(/[^\d-]/g, ''), 10) || 0;

  if (price == null || price < 0) continue;
  products.push({ name, category, price, stock });
}

const categories = [...new Set(products.map((product) => product.category))].sort();

console.log(`Productos listos: ${products.length}`);
console.log(`Categorías: ${categories.length}`);
console.log(categories.join('\n'));
