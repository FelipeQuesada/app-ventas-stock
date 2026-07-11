import { Platform } from 'react-native';
import {
  documentDirectory,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Sale } from '@/types';
import { DailyCaja } from '@/types/caja';
import { getPaymentMethodLabel } from '@/constants/payments';
import { getMonthSales } from '@/services/sales';
import { getMonthCaja } from '@/services/caja';
import {
  getTopProducts,
  getPaymentMethodStats,
  getPaymentMethodRevenueStats,
} from '@/services/stats';
import { formatShortDate } from '@/utils/format';

function buildSalesRows(sales: Sale[]) {
  return sales.map((sale) => ({
    Fecha: formatShortDate(sale.date),
    Hora: format(sale.date, 'HH:mm'),
    Cliente: sale.customer?.name ?? '',
    Email: sale.customer?.email ?? '',
    Teléfono: sale.customer?.phone ?? '',
    Productos: sale.items.map((i) => `${i.productName} x${i.quantity}`).join(' | '),
    Subtotal: sale.subtotal ?? sale.total,
    Descuento: sale.discountAmount ?? 0,
    'Forma de pago': getPaymentMethodLabel(sale.paymentMethod, sale.paymentMethodLabel),
    Total: sale.total,
    'Paga con': sale.amountPaid ?? '',
    Vuelto: sale.change ?? '',
    Vendedor: sale.createdByName ?? '',
  }));
}

function buildProductRows(sales: Sale[]) {
  const products = getTopProducts(sales, 500).sort((a, b) => b.quantity - a.quantity);

  return products.map((product, index) => ({
    '#': index + 1,
    Producto: product.name,
    'Unidades vendidas': product.quantity,
    'Ingresos ($)': product.revenue,
  }));
}

function buildPaymentRows(sales: Sale[]) {
  const byCount = getPaymentMethodStats(sales);
  const byRevenue = getPaymentMethodRevenueStats(sales);
  const revenueMap = new Map(byRevenue.map((item) => [item.label, item.value]));
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  return byCount.map((item, index) => ({
    '#': index + 1,
    'Medio de pago': item.label,
    'Cantidad de ventas': item.value,
    '% ventas': totalSales > 0 ? Math.round((item.value / totalSales) * 1000) / 10 : 0,
    'Ingresos ($)': revenueMap.get(item.label) ?? 0,
    '% ingresos':
      totalRevenue > 0
        ? Math.round(((revenueMap.get(item.label) ?? 0) / totalRevenue) * 1000) / 10
        : 0,
  }));
}

function buildSalesSummaryRows(sales: Sale[], month: Date) {
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const products = getTopProducts(sales, 500).sort((a, b) => b.quantity - a.quantity);
  const payments = getPaymentMethodStats(sales);
  const paymentRevenue = getPaymentMethodRevenueStats(sales);
  const bestProduct = products[0];
  const topPayment = payments[0];
  const topPaymentRevenue = paymentRevenue[0];
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

  return [
    { Concepto: 'Período', Valor: monthLabel },
    { Concepto: 'Total de ventas', Valor: sales.length },
    { Concepto: 'Recaudación total ($)', Valor: totalRevenue },
    { Concepto: '', Valor: '' },
    { Concepto: 'Producto más vendido', Valor: bestProduct?.name ?? '-' },
    { Concepto: 'Unidades del más vendido', Valor: bestProduct?.quantity ?? 0 },
    { Concepto: 'Ingresos del más vendido ($)', Valor: bestProduct?.revenue ?? 0 },
    { Concepto: '', Valor: '' },
    { Concepto: 'Medio de pago más usado', Valor: topPayment?.label ?? '-' },
    { Concepto: 'Ventas con ese medio', Valor: topPayment?.value ?? 0 },
    { Concepto: 'Ingresos con ese medio ($)', Valor: topPaymentRevenue?.value ?? 0 },
  ];
}

function buildCajaRows(records: DailyCaja[]) {
  return records.map((record) => ({
    Fecha: formatShortDate(record.date),
    'Caja cambio': record.cajaCambio,
    'Caja total': record.cajaTotal,
    Ganancia: record.ganancia,
    'Total guardado': record.totalGuardado,
    'Cambio para mañana': record.cambioCierre,
    'Actualizado por': record.updatedByName ?? '',
  }));
}

function buildCajaSummaryRows(records: DailyCaja[], month: Date) {
  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const totalGanancia = records.reduce((sum, record) => sum + record.ganancia, 0);
  const totalCaja = records.reduce((sum, record) => sum + record.cajaTotal, 0);
  const totalGuardado = records.reduce((sum, record) => sum + record.totalGuardado, 0);

  return [
    { Concepto: 'Período', Valor: monthLabel },
    { Concepto: 'Cierres registrados', Valor: records.length },
    { Concepto: 'Ganancia total ($)', Valor: totalGanancia },
    { Concepto: 'Caja total acumulada ($)', Valor: totalCaja },
    { Concepto: 'Total guardado ($)', Valor: totalGuardado },
  ];
}

function appendSheet(workbook: XLSX.WorkBook, rows: Record<string, unknown>[], name: string) {
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
}

async function saveWorkbook(workbook: XLSX.WorkBook, fileName: string, dialogTitle: string) {
  if (Platform.OS === 'web') {
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
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

  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  const fileUri = `${documentDirectory}${fileName}`;

  await writeAsStringAsync(fileUri, base64, {
    encoding: EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle,
    });
  } else {
    throw new Error('No se puede compartir el archivo en este dispositivo');
  }
}

export async function exportMonthSalesToExcel(
  sales: Sale[],
  month: Date = new Date()
): Promise<void> {
  const monthSales = getMonthSales(sales, month);

  if (monthSales.length === 0) {
    throw new Error('No hay ventas en este mes para exportar');
  }

  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const fileName = `ventas-${format(month, 'yyyy-MM')}.xlsx`;
  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, buildSalesSummaryRows(monthSales, month), 'Resumen');
  appendSheet(workbook, buildSalesRows(monthSales), 'Ventas');
  appendSheet(workbook, buildProductRows(monthSales), 'Productos');
  appendSheet(workbook, buildPaymentRows(monthSales), 'Medios de pago');

  await saveWorkbook(workbook, fileName, `Ventas ${monthLabel}`);
}

export async function exportMonthCajaToExcel(
  records: DailyCaja[],
  month: Date = new Date()
): Promise<void> {
  const monthRecords = getMonthCaja(records, month);

  if (monthRecords.length === 0) {
    throw new Error('No hay cierres de caja en este mes para exportar');
  }

  const monthLabel = format(month, 'MMMM yyyy', { locale: es });
  const fileName = `caja-${format(month, 'yyyy-MM')}.xlsx`;
  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, buildCajaSummaryRows(monthRecords, month), 'Resumen');
  appendSheet(workbook, buildCajaRows(monthRecords), 'Cierres');

  await saveWorkbook(workbook, fileName, `Caja ${monthLabel}`);
}
