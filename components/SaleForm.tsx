import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/context/AuthContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductFilters } from '@/components/ProductFilters';
import { ProductListItem } from '@/components/ui/ProductListItem';
import { SaleItemRow } from '@/components/ui/SaleItemRow';
import { PaymentMethodPicker } from '@/components/ui/PaymentMethodPicker';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';
import { getProducts } from '@/services/products';
import {
  createSale,
  updateSale,
  getSale,
  getSales,
  calculateDiscount,
} from '@/services/sales';
import { Product, Sale, SaleItem, PaymentMethod, DiscountType } from '@/types';
import { getPaymentMethodLabel } from '@/constants/payments';
import { formatCurrency } from '@/utils/format';
import { createExtraItem, isExtraItem } from '@/utils/sale';
import {
  filterProductsForSale,
  getProductSalesCounts,
  getUniqueProductCategories,
  hasActiveProductBrowse,
} from '@/utils/productList';
import { showAlert } from '@/utils/alert';
import { SaleTicketModal } from '@/components/SaleTicketModal';
import { SaleTicketData } from '@/utils/saleTicket';
import { getPendingSalesCount, syncPendingSales } from '@/services/offlineQueue';
import { colors, spacing, typography, radius } from '@/constants/theme';

interface SaleFormProps {
  mode: 'create' | 'edit';
  saleId?: string;
}

export function SaleForm({ mode, saleId }: SaleFormProps) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [originalItems, setOriginalItems] = useState<SaleItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [saleDate, setSaleDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState('');

  const [amountPaid, setAmountPaid] = useState('');

  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraDescription, setExtraDescription] = useState('');
  const [extraQuantity, setExtraQuantity] = useState('1');
  const [extraPrice, setExtraPrice] = useState('');
  const [ticketSale, setTicketSale] = useState<SaleTicketData | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const loadProducts = useCallback(async () => {
    const [productsData, salesData] = await Promise.all([
      getProducts(),
      getSales().catch((error) => {
        console.error('Error loading sales for product sorting:', error);
        return [] as Sale[];
      }),
    ]);
    setProducts(productsData);
    setSales(salesData);
    return productsData;
  }, []);

  useEffect(() => {
    if (!isEdit || !saleId) return;

    let active = true;

    (async () => {
      try {
        const [sale] = await Promise.all([getSale(saleId), loadProducts()]);
        if (!active) return;

        if (!sale) {
          showAlert('Error', 'No se encontró la venta');
          router.back();
          return;
        }

        setOriginalItems(sale.items);
        setSelectedItems(sale.items);
        setPaymentMethod(sale.paymentMethod);
        setSaleDate(sale.date);
        setCustomerName(sale.customer.name);
        setCustomerEmail(sale.customer.email);
        setCustomerPhone(sale.customer.phone);
        setDiscountType(sale.discountType ?? null);
        setDiscountValue(sale.discountValue ? String(sale.discountValue) : '');
        setAmountPaid(sale.amountPaid ? String(sale.amountPaid) : '');
      } catch {
        if (active) showAlert('Error', 'No se pudo cargar la venta');
      } finally {
        if (active) setInitialLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isEdit, saleId, loadProducts, router]);

  useFocusEffect(
    useCallback(() => {
      if (!isEdit) {
        loadProducts().catch(() => {
          showAlert('Error', 'No se pudieron cargar los productos');
        });
      }
      getPendingSalesCount().then(setPendingCount).catch(() => undefined);
      syncPendingSales()
        .then(({ synced }) => {
          if (synced > 0) {
            showAlert('Sincronizado', `Se enviaron ${synced} venta(s) pendientes`);
            getPendingSalesCount().then(setPendingCount).catch(() => undefined);
          }
        })
        .catch(() => undefined);
    }, [isEdit, loadProducts])
  );

  const getAvailableStock = useCallback(
    (productId: string) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return 0;

      if (isEdit) {
        const originalQty =
          originalItems.find((item) => item.productId === productId && !isExtraItem(item))
            ?.quantity ?? 0;
        return product.stock + originalQty;
      }

      return product.stock;
    },
    [products, originalItems, isEdit]
  );

  const salesCounts = useMemo(() => getProductSalesCounts(sales), [sales]);

  const categories = useMemo(() => getUniqueProductCategories(products), [products]);

  const productFilters = useMemo(
    () => ({
      search,
      category: selectedCategory,
      showOutOfStock: false,
      showLowStock: false,
    }),
    [search, selectedCategory]
  );

  const showBrowseResults = useMemo(
    () => hasActiveProductBrowse(productFilters),
    [productFilters]
  );

  const filteredProducts = useMemo(
    () => filterProductsForSale(products, productFilters, salesCounts, getAvailableStock),
    [products, productFilters, salesCounts, getAvailableStock]
  );

  const subtotal = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = calculateDiscount(
    subtotal,
    discountType,
    parseFloat(discountValue.replace(',', '.')) || 0
  );
  const total = Math.max(0, subtotal - discountAmount);
  const isCash = paymentMethod === 'efectivo';
  const paidAmount = parseFloat(amountPaid.replace(',', '.')) || 0;
  const change = isCash && paidAmount >= total ? paidAmount - total : 0;

  const addProduct = (product: Product) => {
    const availableStock = getAvailableStock(product.id);
    const existing = selectedItems.find((i) => i.productId === product.id);

    if (existing) {
      if (existing.quantity >= availableStock) {
        showAlert('Stock insuficiente', `Solo hay ${availableStock} unidades disponibles`);
        return;
      }
      updateQuantity(product.id, existing.quantity + 1);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          productId: product.id,
          productName: product.name,
          category: product.category,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ]);
    }
    setSearch('');
    setSelectedCategory(null);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = selectedItems.find((i) => i.productId === productId);
    if (!item) return;

    if (!isExtraItem(item)) {
      const availableStock = getAvailableStock(productId);
      if (quantity > availableStock) {
        showAlert('Stock insuficiente', `Solo hay ${availableStock} unidades disponibles`);
        return;
      }
    }

    setSelectedItems(
      selectedItems.map((current) =>
        current.productId === productId
          ? {
              ...current,
              quantity,
              subtotal: current.unitPrice * quantity,
            }
          : current
      )
    );
  };

  const updateSubtotal = (productId: string, newSubtotal: number) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              subtotal: newSubtotal,
              unitPrice: newSubtotal / item.quantity,
            }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.productId !== productId));
  };

  const resetExtraForm = () => {
    setExtraDescription('');
    setExtraQuantity('1');
    setExtraPrice('');
    setShowExtraForm(false);
  };

  const handleAddExtra = () => {
    const description = extraDescription.trim();
    const quantity = parseInt(extraQuantity, 10);
    const unitPrice = parseFloat(extraPrice.replace(',', '.'));

    if (!description) {
      showAlert('Error', 'Ingresá una descripción para el extra');
      return;
    }
    if (isNaN(quantity) || quantity < 1) {
      showAlert('Error', 'Ingresá una cantidad válida');
      return;
    }
    if (isNaN(unitPrice) || unitPrice < 0) {
      showAlert('Error', 'Ingresá un precio válido');
      return;
    }

    setSelectedItems([...selectedItems, createExtraItem(description, quantity, unitPrice)]);
    resetExtraForm();
  };

  const resetForm = () => {
    setSelectedItems([]);
    setPaymentMethod(null);
    setSaleDate(new Date());
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setDiscountType(null);
    setDiscountValue('');
    setAmountPaid('');
    resetExtraForm();
    loadProducts();
  };

  const buildSaleInput = () => ({
    date: saleDate,
    items: selectedItems,
    paymentMethod: paymentMethod!,
    paymentMethodLabel: getPaymentMethodLabel(paymentMethod!),
    customer: {
      name: customerName.trim(),
      email: customerEmail.trim(),
      phone: customerPhone.trim(),
    },
    subtotal,
    discountType: discountType ?? undefined,
    discountValue: parseFloat(discountValue.replace(',', '.')) || 0,
    discountAmount,
    total,
    amountPaid: isCash ? paidAmount : undefined,
    change: isCash ? change : undefined,
    createdBy: user!.uid,
    createdByName: profile?.name,
  });

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      showAlert('Error', 'Agregá al menos un producto o extra');
      return;
    }
    if (!paymentMethod) {
      showAlert('Error', 'Seleccioná una forma de pago');
      return;
    }
    if (isCash && paidAmount < total) {
      showAlert('Error', 'El monto pagado debe ser mayor o igual al total');
      return;
    }

    setLoading(true);
    try {
      const input = buildSaleInput();
      const ticket: SaleTicketData = {
        date: input.date,
        items: input.items,
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        total: input.total,
        paymentMethod: input.paymentMethod,
        paymentMethodLabel: input.paymentMethodLabel,
        customer: input.customer,
        amountPaid: input.amountPaid,
        change: input.change,
        createdByName: input.createdByName,
      };

      if (isEdit && saleId) {
        await updateSale(saleId, input, originalItems);
        setTicketSale(ticket);
      } else {
        try {
          await createSale(input);
          setTicketSale(ticket);
          resetForm();
        } catch (error) {
          const queued = (error as Error & { queued?: boolean })?.queued;
          if (queued) {
            setPendingCount((c) => c + 1);
            setTicketSale(ticket);
            resetForm();
            showAlert(
              'Guardada offline',
              'Sin conexión. La venta quedó en cola y se sincronizará cuando vuelva internet.'
            );
            return;
          }
          throw error;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo guardar la venta';
      showAlert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingScreen />;

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <MaterialIcons name="cloud-off" size={18} color={colors.warning} />
          <Text style={styles.pendingText}>
            {pendingCount} venta(s) pendiente(s) de sincronizar
          </Text>
        </View>
      )}

      <DatePickerField value={saleDate} onChange={setSaleDate} />

      <Text style={styles.sectionTitle}>Datos del cliente</Text>
      <Input
        label="Nombre (opcional)"
        value={customerName}
        onChangeText={setCustomerName}
        placeholder="Nombre y apellido"
        autoCapitalize="words"
      />
      <Input
        label="Email (opcional)"
        value={customerEmail}
        onChangeText={setCustomerEmail}
        placeholder="cliente@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input
        label="Teléfono (opcional)"
        value={customerPhone}
        onChangeText={setCustomerPhone}
        placeholder="11 2345 6789"
        keyboardType="phone-pad"
      />

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar producto..."
      />

      <ProductFilters
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        showOutOfStock={false}
        showLowStock={false}
        showOutOfStockFilter={false}
        showLowStockFilter={false}
      />

      {showBrowseResults && (
        <View style={styles.searchResults}>
          {filteredProducts.length === 0 ? (
            <Text style={styles.noResults}>No hay productos con estos filtros</Text>
          ) : (
            filteredProducts.slice(0, 15).map((product) => (
              <ProductListItem
                key={product.id}
                product={product}
                onPress={() => addProduct(product)}
                showAddButton
                onAdd={() => addProduct(product)}
              />
            ))
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.addExtraButton}
        onPress={() => setShowExtraForm((prev) => !prev)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={22} color={colors.success} />
        <Text style={styles.addExtraText}>Agregar extra</Text>
      </TouchableOpacity>

      {showExtraForm && (
        <View style={styles.extraForm}>
          <Text style={styles.extraFormTitle}>Extra personalizado</Text>
          <Input
            label="Descripción"
            value={extraDescription}
            onChangeText={setExtraDescription}
            placeholder="Ej: Instalación, flete, etc."
          />
          <View style={styles.extraRow}>
            <View style={styles.extraField}>
              <Input
                label="Cantidad"
                value={extraQuantity}
                onChangeText={setExtraQuantity}
                keyboardType="number-pad"
                placeholder="1"
              />
            </View>
            <View style={styles.extraField}>
              <Input
                label="Precio c/u"
                value={extraPrice}
                onChangeText={setExtraPrice}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          </View>
          <View style={styles.extraActions}>
            <Button title="Cancelar" onPress={resetExtraForm} variant="outline" size="sm" style={styles.extraActionBtn} />
            <Button title="Agregar" onPress={handleAddExtra} size="sm" style={styles.extraActionBtn} />
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        Productos seleccionados ({selectedItems.length})
      </Text>

      {selectedItems.length === 0 ? (
        <EmptyState
          icon="add-shopping-cart"
          title="Sin productos"
          subtitle="Buscá productos o agregá un extra"
        />
      ) : (
        selectedItems.map((item) => (
          <SaleItemRow
            key={item.productId}
            item={item}
            onQuantityChange={(qty) => updateQuantity(item.productId, qty)}
            onSubtotalChange={(price) => updateSubtotal(item.productId, price)}
            onRemove={() => removeItem(item.productId)}
          />
        ))
      )}

      <Text style={styles.sectionTitle}>Descuento</Text>
      <View style={styles.discountTypeRow}>
        <TouchableOpacity
          style={[styles.discountChip, discountType === 'percent' && styles.discountChipActive]}
          onPress={() => setDiscountType(discountType === 'percent' ? null : 'percent')}
        >
          <Text style={[styles.discountChipText, discountType === 'percent' && styles.discountChipTextActive]}>
            Porcentaje %
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.discountChip, discountType === 'fixed' && styles.discountChipActive]}
          onPress={() => setDiscountType(discountType === 'fixed' ? null : 'fixed')}
        >
          <Text style={[styles.discountChipText, discountType === 'fixed' && styles.discountChipTextActive]}>
            Monto fijo $
          </Text>
        </TouchableOpacity>
      </View>
      {discountType && (
        <Input
          label={discountType === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}
          value={discountValue}
          onChangeText={setDiscountValue}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      )}

      <PaymentMethodPicker
        value={paymentMethod}
        onChange={(method) => {
          setPaymentMethod(method);
          if (method !== 'efectivo') setAmountPaid('');
        }}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Descuento</Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              -{formatCurrency(discountAmount)}
            </Text>
          </View>
        )}
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </View>

      {isCash && (
        <View style={styles.cashSection}>
          <View style={styles.cashRow}>
            <View style={styles.cashInput}>
              <Input
                label="Paga con"
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.changeBox}>
              <Text style={styles.changeLabel}>Vuelto</Text>
              <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
            </View>
          </View>
        </View>
      )}

      <Button
        title={isEdit ? 'Guardar cambios' : 'Registrar venta'}
        onPress={handleSubmit}
        loading={loading}
        size="lg"
        variant="secondary"
        style={styles.registerButton}
      />
    </ScrollView>

    <SaleTicketModal
      visible={!!ticketSale}
      sale={ticketSale}
      title={isEdit ? 'Venta actualizada' : 'Venta registrada'}
      onClose={() => {
        setTicketSale(null);
        if (isEdit) router.back();
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '22',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  pendingText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  searchResults: {
    marginBottom: spacing.md,
  },
  noResults: {
    ...typography.bodySmall,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  addExtraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderStyle: 'dashed',
    backgroundColor: colors.success + '12',
  },
  addExtraText: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.success,
  },
  extraForm: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  extraFormTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  extraRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  extraField: {
    flex: 1,
  },
  extraActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  extraActionBtn: {
    flex: 1,
  },
  discountTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  discountChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  discountChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  discountChipText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  discountChipTextActive: {
    color: colors.white,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  discountValue: {
    color: colors.success,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  totalValue: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
  },
  cashSection: {
    marginBottom: spacing.md,
  },
  cashRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  cashInput: {
    flex: 1,
  },
  changeBox: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    minWidth: 120,
    alignItems: 'center',
  },
  changeLabel: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.white,
    opacity: 0.8,
  },
  changeValue: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
  registerButton: {
    width: '100%',
  },
});
