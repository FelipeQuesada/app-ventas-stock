import { format, addDays, parseISO, isValid } from 'date-fns';
import { Asset } from 'expo-asset';
import {
  calculateDiscount,
  calculateSaleTotal,
  formatCurrency,
  type DiscountType,
  type Presupuesto,
  type PresupuestoItem,
} from '@advance-coat/shared';

export type { PresupuestoItem };

export interface PresupuestoData {
  date: string;
  validUntil: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientCuit?: string;
  items: PresupuestoItem[];
  notes?: string;
  signerName?: string;
  discountType?: DiscountType | null;
  discountValue?: number;
  discountAmount?: number;
}

function toIsoDate(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return format(value, 'yyyy-MM-dd');
}

export function presupuestoToPdfData(p: Presupuesto): PresupuestoData {
  return {
    date: toIsoDate(p.date),
    validUntil: toIsoDate(p.validUntil),
    contactName: p.contactName,
    contactPhone: p.contactPhone,
    contactEmail: p.contactEmail,
    clientName: p.customer.name,
    clientPhone: p.customer.phone,
    clientEmail: p.customer.email || undefined,
    clientCuit: p.customer.cuit || undefined,
    items: p.items,
    notes: p.notes,
    signerName: p.contactName,
    discountType: p.discountType,
    discountValue: p.discountValue,
    discountAmount: p.discountAmount,
  };
}

const BRAND = {
  dark: '#2E6B8E',
  mid: '#5A93B5',
  light: '#84B1CE',
  soft: '#D6E8F2',
  text: '#1A1A2E',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number): string {
  return `${formatCurrency(amount)}-`;
}

function formatDisplayDate(iso: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return iso;
  return format(d, 'dd/MM/yyyy');
}

export function buildPresupuestoDocumentTitle(clientName?: string): string {
  const clean = (clientName ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? `Presupuesto Advance Coat ${clean}` : 'Presupuesto Advance Coat';
}

export function defaultValidUntil(fromIso: string, days = 10): string {
  const d = parseISO(fromIso);
  if (!isValid(d)) return fromIso;
  return format(addDays(d, days), 'yyyy-MM-dd');
}

export async function resolvePresupuestoLogoUri(): Promise<string | null> {
  try {
    const asset = Asset.fromModule(require('../assets/images/logo-advance.png'));
    await asset.downloadAsync();
    return asset.localUri ?? asset.uri ?? null;
  } catch {
    return null;
  }
}

export function buildPresupuestoHtml(data: PresupuestoData, logoUrl?: string | null): string {
  const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount =
    data.discountAmount ??
    calculateDiscount(subtotal, data.discountType ?? null, data.discountValue ?? 0);
  const total = calculateSaleTotal(subtotal, discountAmount);
  const discountLabel =
    data.discountType === 'percent'
      ? `Descuento (${data.discountValue ?? 0}%)`
      : 'Descuento';

  const minRows = 8;
  const rowsHtml = Array.from({ length: Math.max(minRows, data.items.length) }, (_, index) => {
    const item = data.items[index];
    const stripe = index % 2 === 0 ? BRAND.soft : BRAND.light;
    if (!item) {
      return `<tr style="background:${stripe}"><td>&nbsp;</td><td></td><td></td><td></td></tr>`;
    }
    return `<tr style="background:${stripe}">
      <td>${escapeHtml(item.productName)}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${escapeHtml(formatMoney(item.unitPrice))}</td>
      <td style="text-align:right">${escapeHtml(formatMoney(item.subtotal))}</td>
    </tr>`;
  }).join('');

  const defaultNotes = [
    'Los precios incluyen IVA.',
    'Condición de pago: Transferencia anticipada e inmediata, la confirmación del pedido y el pago debe estar dentro del periodo de validez del presupuesto.',
    'Envío: a cargo del cliente (Correo Argentino / transporte a convenir).',
    'Tiempo de despacho: 24 a 48 hs hábiles luego de la confirmación.',
    'Brindamos instructivos de uso del producto en forma de PDF, videos y audios. Pueden pedirlo una vez que se realice el pedido.',
    `Presupuesto válido del ${formatDisplayDate(data.date)} al ${formatDisplayDate(data.validUntil)}.`,
  ];

  const notesLines = (data.notes?.trim()
    ? data.notes
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : defaultNotes
  )
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Advance Coat" />`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(buildPresupuestoDocumentTitle(data.clientName))}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: ${BRAND.text};
      background: #fff;
    }
    .sheet { width: 100%; max-width: 780px; margin: 0 auto; }
    .header {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      background: ${BRAND.dark};
      color: #fff;
      min-height: 92px;
      clip-path: polygon(0 0, 100% 0, 100% 78%, 0 100%);
      padding: 18px 22px 28px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand img { width: 58px; height: 58px; object-fit: contain; background: #fff; border-radius: 10px; padding: 4px; }
    .brand h1 { margin: 0; font-size: 28px; letter-spacing: 1px; }
    .brand p { margin: 2px 0 0; font-size: 13px; opacity: 0.95; letter-spacing: 0.5px; }
    .date-box {
      align-self: center;
      background: #fff;
      color: ${BRAND.text};
      padding: 10px 14px;
      font-weight: 700;
      font-size: 14px;
      border-radius: 4px;
    }
    .contacts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 18px 8px 12px;
      font-size: 13px;
      line-height: 1.45;
    }
    .contacts h3 {
      margin: 0 0 8px;
      font-size: 12px;
      letter-spacing: 0.6px;
      color: ${BRAND.dark};
    }
    .contacts p { margin: 0 0 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 13px;
    }
    thead th {
      background: ${BRAND.dark};
      color: #fff;
      padding: 10px 12px;
      text-align: left;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    tbody td {
      padding: 9px 12px;
      border: none;
      min-height: 28px;
    }
    .total-wrap {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    .total-box {
      min-width: 260px;
      background: ${BRAND.soft};
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 16px;
      color: ${BRAND.dark};
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      font-weight: 600;
    }
    .total-row.final {
      margin-top: 4px;
      padding-top: 8px;
      border-top: 1px solid ${BRAND.light};
      font-size: 15px;
      font-weight: 700;
    }
    .total-row.discount { color: #b45309; }
    .details {
      display: grid;
      grid-template-columns: 1.4fr 0.8fr;
      gap: 20px;
      margin-top: 22px;
      padding: 0 4px;
    }
    .details h3 {
      margin: 0 0 8px;
      font-size: 13px;
      letter-spacing: 0.5px;
      color: ${BRAND.dark};
    }
    .details ul {
      margin: 0;
      padding-left: 18px;
      font-size: 11.5px;
      line-height: 1.5;
      color: #333;
    }
    .sign { text-align: center; padding-top: 18px; }
    .sign p { margin: 0 0 28px; font-size: 12px; color: #444; }
    .sign .name {
      font-family: "Segoe Script", "Brush Script MT", cursive;
      font-size: 28px;
      color: ${BRAND.dark};
    }
    .footer {
      margin-top: 28px;
      background: ${BRAND.dark};
      color: #fff;
      display: flex;
      justify-content: space-around;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      font-size: 11px;
      letter-spacing: 0.4px;
    }
    .footer span { white-space: nowrap; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div class="brand">
        ${logoHtml}
        <div>
          <h1>ADVANCE COAT</h1>
          <p>RESINAS EPOXI</p>
        </div>
      </div>
      <div class="date-box">FECHA: ${escapeHtml(formatDisplayDate(data.date))}</div>
    </div>

    <div class="contacts">
      <div>
        <h3>PERSONA DE CONTACTO</h3>
        <p><strong>${escapeHtml(data.contactName || '—')}</strong></p>
        <p>Teléfono: ${escapeHtml(data.contactPhone || '—')}</p>
        <p>Email: ${escapeHtml(data.contactEmail || '—')}</p>
      </div>
      <div>
        <h3>PARA</h3>
        <p><strong>${escapeHtml(data.clientName || '—')}</strong></p>
        ${data.clientCuit ? `<p>CUIT / CUIL: ${escapeHtml(data.clientCuit)}</p>` : ''}
        ${data.clientPhone ? `<p>Teléfono: ${escapeHtml(data.clientPhone)}</p>` : ''}
        ${data.clientEmail ? `<p>Email: ${escapeHtml(data.clientEmail)}</p>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:46%">PRODUCTO</th>
          <th style="width:14%; text-align:center">CANTIDAD</th>
          <th style="width:20%; text-align:right">PRECIO</th>
          <th style="width:20%; text-align:right">TOTAL</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div class="total-wrap">
      <div class="total-box">
        ${
          discountAmount > 0
            ? `<div class="total-row"><span>Subtotal</span><span>${escapeHtml(formatMoney(subtotal))}</span></div>
        <div class="total-row discount"><span>${escapeHtml(discountLabel)}</span><span>-${escapeHtml(formatMoney(discountAmount))}</span></div>`
            : ''
        }
        <div class="total-row final">
          <span>TOTAL</span>
          <span>${escapeHtml(formatMoney(total))}</span>
        </div>
      </div>
    </div>

    <div class="details">
      <div>
        <h3>OTROS DETALLES</h3>
        <ul>${notesLines}</ul>
      </div>
      <div class="sign">
        <p>Ante cualquier duda estamos a su disposición</p>
        <div class="name">${escapeHtml(data.signerName || data.contactName || 'Advance Coat')}</div>
      </div>
    </div>

    <div class="footer">
      <span>ADVANCECOAT.ARG@GMAIL.COM</span>
      <span>WWW.ADVANCECOAT.COM.AR</span>
      <span>+54 9 11 5171-4211</span>
    </div>
  </div>
</body>
</html>`;
}

export async function buildPresupuestoHtmlAsync(data: PresupuestoData): Promise<string> {
  const logo = await resolvePresupuestoLogoUri();
  return buildPresupuestoHtml(data, logo);
}
