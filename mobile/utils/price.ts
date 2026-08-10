export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value == null || value === '') return null;

  const text = String(value).trim().replace(/[$\s]/g, '');
  if (!text) return null;

  // 4,000.00 | 8,500.00 — coma como separador de miles, punto decimal
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
    return Number.parseFloat(text.replace(/,/g, ''));
  }

  // 4.000,00 | 8.500,00 — punto como separador de miles, coma decimal
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    return Number.parseFloat(text.replace(/\./g, '').replace(',', '.'));
  }

  // 45000,50 — coma decimal sin separador de miles
  if (/^\d+,\d+$/.test(text) && !text.includes('.')) {
    return Number.parseFloat(text.replace(',', '.'));
  }

  // 45.000 — solo punto como separador de miles
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    return Number.parseFloat(text.replace(/\./g, ''));
  }

  const parsed = Number.parseFloat(text.replace(/,/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}
