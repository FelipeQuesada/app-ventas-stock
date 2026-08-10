import { Platform, Share, Linking } from 'react-native';
import {
  documentDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Sale } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { format } from 'date-fns';

export type SaleTicketData = Pick<
  Sale,
  | 'date'
  | 'items'
  | 'subtotal'
  | 'discountAmount'
  | 'total'
  | 'paymentMethod'
  | 'paymentMethodLabel'
  | 'customer'
  | 'amountPaid'
  | 'change'
  | 'createdByName'
> & { id?: string };

/** Normaliza teléfonos AR a formato wa.me (549XXXXXXXXXX). */
export function normalizeWhatsAppPhone(phone: string | undefined | null): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('54')) {
    // ok
  } else if (digits.startsWith('0')) {
    digits = `54${digits.slice(1)}`;
  } else if (digits.length <= 10) {
    digits = `549${digits}`;
  } else {
    digits = `54${digits}`;
  }

  // Asegurar 549 para móviles AR sin el 9
  if (digits.startsWith('54') && !digits.startsWith('549') && digits.length >= 12) {
    digits = `549${digits.slice(2)}`;
  }

  return digits;
}

export function buildWhatsAppUrl(phone: string | null | undefined, text: string): string {
  const normalized = normalizeWhatsAppPhone(phone ?? '');
  const encoded = encodeURIComponent(text);
  if (normalized) return `https://wa.me/${normalized}?text=${encoded}`;
  return `https://wa.me/?text=${encoded}`;
}

export function buildSaleTicketText(sale: Sale | SaleTicketData): string {
  const lines: string[] = [];
  lines.push('ADVANCE COAT');
  lines.push('Presupuesto');
  lines.push('----------------------------');
  lines.push(`Fecha: ${formatDate(sale.date)}`);
  if (sale.createdByName) lines.push(`Vendedor: ${sale.createdByName}`);
  if (sale.customer?.name) lines.push(`Cliente: ${sale.customer.name}`);
  if (sale.customer?.phone) lines.push(`Tel: ${sale.customer.phone}`);
  lines.push('----------------------------');

  for (const item of sale.items) {
    lines.push(`${item.productName}`);
    lines.push(
      `  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.subtotal)}`
    );
  }

  lines.push('----------------------------');
  lines.push(`Subtotal: ${formatCurrency(sale.subtotal)}`);
  if ((sale.discountAmount ?? 0) > 0) {
    lines.push(`Descuento: -${formatCurrency(sale.discountAmount ?? 0)}`);
  }
  lines.push(`TOTAL: ${formatCurrency(sale.total)}`);
  lines.push('----------------------------');
  lines.push('Formulario de uso');
  lines.push('https://linktr.ee/AdvanceCoat');
  return lines.join('\n');
}

export function buildSaleTicketHtml(sale: Sale | SaleTicketData): string {
  const itemsHtml = sale.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}<br/><small>${item.quantity} x ${formatCurrency(item.unitPrice)}</small></td>
        <td style="text-align:right">${formatCurrency(item.subtotal)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body { font-family: Arial, sans-serif; color: #1A1A2E; padding: 24px; margin: 0; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .meta { color: #6B7280; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td { padding: 8px 0; border-bottom: 1px solid #E8ECF4; vertical-align: top; font-size: 13px; }
    .total { font-size: 18px; font-weight: bold; color: #E94560; }
    .label { color: #6B7280; }
  </style>
</head>
<body>
  <h1>Advance Coat</h1>
  <div class="meta">Presupuesto · ${formatDate(sale.date)}</div>
  ${sale.createdByName ? `<p><strong>Vendedor:</strong> ${escapeHtml(sale.createdByName)}</p>` : ''}
  ${sale.customer?.name ? `<p><strong>Cliente:</strong> ${escapeHtml(sale.customer.name)}</p>` : ''}
  ${sale.customer?.phone ? `<p><strong>Tel:</strong> ${escapeHtml(sale.customer.phone)}</p>` : ''}
  <table>${itemsHtml}</table>
  <p class="label">Subtotal: ${formatCurrency(sale.subtotal)}</p>
  ${(sale.discountAmount ?? 0) > 0 ? `<p class="label">Descuento: -${formatCurrency(sale.discountAmount ?? 0)}</p>` : ''}
  <p class="total">TOTAL: ${formatCurrency(sale.total)}</p>
  <p class="meta">Formulario de uso<br/><a href="https://linktr.ee/AdvanceCoat">https://linktr.ee/AdvanceCoat</a></p>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function shareSaleTicket(sale: Sale | SaleTicketData): Promise<void> {
  const text = buildSaleTicketText(sale);

  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ title: 'Presupuesto', text });
      return;
    }
    await navigator.clipboard.writeText(text);
    return;
  }

  await Share.share({
    message: text,
    title: 'Presupuesto',
  });
}

export async function shareSaleTicketWhatsApp(
  sale: Sale | SaleTicketData,
  phone?: string | null
): Promise<{ usedCustomerPhone: boolean }> {
  const text = buildSaleTicketText(sale);
  const targetPhone = phone ?? sale.customer?.phone;
  const url = buildWhatsAppUrl(targetPhone, text);
  const usedCustomerPhone = !!normalizeWhatsAppPhone(targetPhone ?? '');

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return { usedCustomerPhone };
  }
  await shareSaleTicket(sale);
  return { usedCustomerPhone };
}

export async function exportSaleTicketFile(sale: Sale | SaleTicketData): Promise<void> {
  const text = buildSaleTicketText(sale);
  const fileName = `ticket-${format(sale.date, 'yyyyMMdd-HHmm')}.txt`;

  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const fileUri = `${documentDirectory}${fileName}`;
  await writeAsStringAsync(fileUri, text, { encoding: EncodingType.UTF8 });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: 'Compartir ticket',
    });
  } else {
    await Share.share({ message: text });
  }
}

export async function exportSaleTicketPdf(sale: Sale | SaleTicketData): Promise<void> {
  const html = buildSaleTicketHtml(sale);
  const fileName = `ticket-${format(sale.date, 'yyyyMMdd-HHmm')}.pdf`;

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await Print.printAsync({ html });
  }
}
