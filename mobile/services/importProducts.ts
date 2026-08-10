import * as XLSX from 'xlsx';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { createProduct } from '@/services/products';
import { parsePrice } from '@/utils/price';

export interface ImportProductRow {
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: ImportRowError[];
}

type ProductField = keyof ImportProductRow;

const COLUMN_ALIASES: Record<string, ProductField> = {
  nombre: 'name',
  name: 'name',
  producto: 'name',
  product: 'name',
  categoria: 'category',
  categorias: 'category',
  category: 'category',
  categories: 'category',
  cat: 'category',
  precio: 'price',
  price: 'price',
  valor: 'price',
  stock: 'stock',
  cantidad: 'stock',
  inventario: 'stock',
};

const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/comma-separated-values',
];

const TIENDANUBE_URL_HEADER = 'identificador de url';

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseStock(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return Math.max(0, value);
  if (value == null || value === '') return null;

  const parsed = Number.parseInt(String(value).trim().replace(/[^\d-]/g, ''), 10);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
}

function parseCategoryValue(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';

  const firstCategory = value.split(',')[0].trim();
  if (firstCategory.includes('>')) {
    return firstCategory.split('>').pop()!.trim();
  }

  return firstCategory;
}

function inferCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('molde')) return 'Moldes de Silicona';
  if (lower.includes('resina')) return 'Resinas Epoxi';
  if (lower.includes('combo')) return 'Combos';
  if (lower.includes('pigmento') || lower.includes('glitter')) return 'Pigmentos';
  if (lower.includes('curso') || lower.includes('taller')) return 'Cursos de Resina Epoxi';
  return '';
}

function resolveSalePrice(regularRaw: unknown, promoRaw: unknown): number | null {
  const regular = parsePrice(regularRaw);
  const promotional = parsePrice(promoRaw);

  if (
    promotional != null &&
    promotional > 1 &&
    regular != null &&
    promotional < regular
  ) {
    return promotional;
  }

  return regular;
}

function getCellValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') {
      return row[key];
    }
  }
  return '';
}

function buildVariantName(baseName: string, row: Record<string, unknown>): string {
  const variantValues = [1, 2, 3]
    .map((index) => String(getCellValue(row, `Valor de propiedad ${index}`) ?? '').trim())
    .filter(Boolean);

  if (variantValues.length === 0) return baseName;
  return `${baseName} - ${variantValues.join(' / ')}`;
}

function isTiendaNubeExport(headers: string[]): boolean {
  return headers.some((header) => normalizeHeader(header) === TIENDANUBE_URL_HEADER);
}

function mapHeaders(headers: string[]): Record<number, ProductField> {
  const mapping: Record<number, ProductField> = {};

  headers.forEach((header, index) => {
    const field = COLUMN_ALIASES[normalizeHeader(header)];
    if (field && mapping[index] === undefined) {
      mapping[index] = field;
    }
  });

  return mapping;
}

function rowToProduct(
  values: unknown[],
  headerMap: Record<number, ProductField>,
  rowNumber: number
): { row?: ImportProductRow; error?: ImportRowError } {
  const draft: Partial<ImportProductRow> = {};

  Object.entries(headerMap).forEach(([index, field]) => {
    const value = values[Number(index)];
    if (field === 'name' || field === 'category') {
      draft[field] = String(value ?? '').trim();
      return;
    }
    if (field === 'price') {
      const price = parsePrice(value);
      if (price != null) draft.price = price;
      return;
    }
    if (field === 'stock') {
      const stock = parseStock(value);
      if (stock != null) draft.stock = stock;
    }
  });

  const name = draft.name?.trim();
  const category = draft.category?.trim();

  if (!name && !category && draft.price == null && draft.stock == null) {
    return { error: { row: rowNumber, message: 'Fila vacía' } };
  }

  if (!name) {
    return { error: { row: rowNumber, message: 'Falta el nombre del producto' } };
  }
  if (!category) {
    return { error: { row: rowNumber, message: 'Falta la categoría' } };
  }
  if (draft.price == null || draft.price < 0) {
    return { error: { row: rowNumber, message: 'Precio inválido' } };
  }
  if (draft.stock == null) {
    return { error: { row: rowNumber, message: 'Stock inválido' } };
  }

  return {
    row: {
      name,
      category,
      price: draft.price,
      stock: draft.stock,
    },
  };
}

function parseTiendaNubeRows(rows: Record<string, unknown>[]): {
  products: ImportProductRow[];
  errors: ImportRowError[];
} {
  const products: ImportProductRow[] = [];
  const errors: ImportRowError[] = [];
  let parentName = '';
  let parentCategory = '';

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const nameValue = String(getCellValue(row, 'Nombre') ?? '').trim();
    const isVariantRow = !nameValue;

    if (nameValue) {
      parentName = nameValue;
      parentCategory =
        parseCategoryValue(getCellValue(row, 'Categorías')) ||
        inferCategoryFromName(nameValue);
    }

    if (!parentName) {
      return;
    }

    const productName = buildVariantName(parentName, row);
    const category =
      parseCategoryValue(getCellValue(row, 'Categorías')) ||
      (isVariantRow ? parentCategory : inferCategoryFromName(parentName)) ||
      parentCategory ||
      'Sin categoría';
    const price = resolveSalePrice(
      getCellValue(row, 'Precio'),
      getCellValue(row, 'Precio promocional')
    );
    const stock = parseStock(getCellValue(row, 'Stock'));

    if (price == null || price < 0) {
      errors.push({ row: rowNumber, message: `Precio inválido para "${productName}"` });
      return;
    }

    products.push({
      name: productName,
      category,
      price,
      stock: stock ?? 0,
    });
  });

  return { products, errors };
}

function parseStandardSheet(matrix: unknown[][]): {
  rows: ImportProductRow[];
  errors: ImportRowError[];
} {
  if (matrix.length < 2) {
    throw new Error('El archivo no tiene filas de productos');
  }

  const headers = (matrix[0] ?? []).map((cell) => String(cell ?? ''));
  const headerMap = mapHeaders(headers);

  if (!Object.values(headerMap).includes('name')) {
    throw new Error('No se encontró la columna "nombre" en el archivo');
  }
  if (!Object.values(headerMap).includes('category')) {
    throw new Error('No se encontró la columna "categoria" en el archivo');
  }
  if (!Object.values(headerMap).includes('price')) {
    throw new Error('No se encontró la columna "precio" en el archivo');
  }
  if (!Object.values(headerMap).includes('stock')) {
    throw new Error('No se encontró la columna "stock" en el archivo');
  }

  const rows: ImportProductRow[] = [];
  const errors: ImportRowError[] = [];

  matrix.slice(1).forEach((rawRow, index) => {
    const values = Array.isArray(rawRow) ? rawRow : [];
    const rowNumber = index + 2;
    const result = rowToProduct(values, headerMap, rowNumber);

    if (result.row) {
      rows.push(result.row);
      return;
    }

    if (result.error?.message !== 'Fila vacía') {
      errors.push(result.error!);
    }
  });

  if (rows.length === 0) {
    throw new Error('No hay productos válidos para importar');
  }

  return { rows, errors };
}

export function parseProductsWorkbook(workbook: XLSX.WorkBook): {
  rows: ImportProductRow[];
  errors: ImportRowError[];
} {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo no tiene hojas de cálculo');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (matrix.length < 2) {
    throw new Error('El archivo no tiene filas de productos');
  }

  const headers = (matrix[0] ?? []).map((cell) => String(cell ?? ''));

  if (isTiendaNubeExport(headers)) {
    const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });
    const { products, errors } = parseTiendaNubeRows(objectRows);

    if (products.length === 0) {
      throw new Error('No hay productos válidos para importar');
    }

    return { rows: products, errors };
  }

  return parseStandardSheet(matrix);
}

function getWorkbookReadOptions(filename?: string): XLSX.ParsingOptions {
  const isCsv = filename?.toLowerCase().endsWith('.csv');
  return {
    type: 'array',
    ...(isCsv ? { FS: ';', raw: true } : {}),
  };
}

export async function readWorkbookFromUri(
  uri: string,
  filename?: string
): Promise<XLSX.WorkBook> {
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  const isCsv = (filename ?? uri).toLowerCase().includes('.csv');
  return XLSX.read(base64, {
    type: 'base64',
    ...(isCsv ? { FS: ';', raw: true } : {}),
  });
}

export async function readWorkbookFromFile(file: File): Promise<XLSX.WorkBook> {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, getWorkbookReadOptions(file.name));
}

export async function importProducts(rows: ImportProductRow[]): Promise<ImportResult> {
  let created = 0;
  const errors: ImportRowError[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    try {
      await createProduct({
        name: row.name,
        category: row.category,
        description: '',
        price: row.price,
        stock: row.stock,
        imageUrl: '',
      });
      created += 1;
    } catch {
      errors.push({
        row: index + 2,
        message: `No se pudo guardar "${row.name}"`,
      });
    }
  }

  return {
    created,
    skipped: rows.length - created,
    errors,
  };
}

export { EXCEL_MIME_TYPES };
