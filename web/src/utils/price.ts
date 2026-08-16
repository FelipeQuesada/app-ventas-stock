export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (value == null || value === '') return null;

  const text = String(value).trim().replace(/[$\s]/g, '');
  if (!text) return null;

  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
    return Number.parseFloat(text.replace(/,/g, ''));
  }

  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    return Number.parseFloat(text.replace(/\./g, '').replace(',', '.'));
  }

  if (/^\d+,\d+$/.test(text) && !text.includes('.')) {
    return Number.parseFloat(text.replace(',', '.'));
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    return Number.parseFloat(text.replace(/\./g, ''));
  }

  const parsed = Number.parseFloat(text.replace(/,/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}
