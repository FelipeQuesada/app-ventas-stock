import { Platform, Share, Linking } from 'react-native';
import {
  documentDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Sale } from '@/types';
import { getPaymentMethodLabel } from '@/constants/payments';
import { formatCurrency, formatDate } from '@/utils/format';
import { format } from 'date-fns';

export function buildSaleTicketText(sale: Sale | SaleTicketData): string {
  const lines: string[] = [];
  lines.push('ADVANCE COAT');
  lines.push('Comprobante de venta');
  lines.push('----------------------------');
  lines.push(`Fecha: ${formatDate(sale.date)}`);
  lines.push(`Hora: ${format(sale.date, 'HH:mm')}`);
  if (sale.customer?.name) lines.push(`Cliente: ${sale.customer.name}`);
  if (sale.customer?.phone) lines.push(`Tel: ${sale.customer.phone}`);
  if (sale.customer?.email) lines.push(`Email: ${sale.customer.email}`);
  lines.push('----------------------------');

  for (const item of sale.items) {
    lines.push(`${item.productName}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.subtotal)}`);
  }

  lines.push('----------------------------');
  lines.push(`Subtotal: ${formatCurrency(sale.subtotal)}`);
  if ((sale.discountAmount ?? 0) > 0) {
    lines.push(`Descuento: -${formatCurrency(sale.discountAmount ?? 0)}`);
  }
  lines.push(`TOTAL: ${formatCurrency(sale.total)}`);
  lines.push(
    `Pago: ${getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel)}`
  );
  if (sale.amountPaid != null) {
    lines.push(`Paga con: ${formatCurrency(sale.amountPaid)}`);
  }
  if (sale.change != null) {
    lines.push(`Vuelto: ${formatCurrency(sale.change)}`);
  }
  if (sale.createdByName) {
    lines.push(`Vendedor: ${sale.createdByName}`);
  }
  lines.push('----------------------------');
  lines.push('¡Gracias por su compra!');
  return lines.join('\n');
}

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

export async function shareSaleTicket(sale: Sale | SaleTicketData): Promise<void> {
  const text = buildSaleTicketText(sale);

  if (Platform.OS === 'web') {
    if (navigator.share) {
      await navigator.share({ title: 'Comprobante de venta', text });
      return;
    }
    await navigator.clipboard.writeText(text);
    return;
  }

  await Share.share({
    message: text,
    title: 'Comprobante de venta',
  });
}

export async function shareSaleTicketWhatsApp(sale: Sale | SaleTicketData): Promise<void> {
  const text = buildSaleTicketText(sale);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
    return;
  }
  await shareSaleTicket(sale);
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
