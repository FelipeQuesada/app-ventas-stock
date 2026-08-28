import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { SearchBar } from '@/components/ui/SearchBar';
import { ProductFilters } from '@/components/ProductFilters';
import { ProductListItem } from '@/components/ui/ProductListItem';
import { SaleItemRow } from '@/components/ui/SaleItemRow';
import { PaymentMethodPicker, PaymentMode } from '@/components/ui/PaymentMethodPicker';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SelectField } from '@/components/ui/SelectField';
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
  fetchCustomerPurchaseStats,
} from '@/services/sales';
import { findCustomerByPhone } from '@/services/customers';
import { Product, Sale, SaleItem, PaymentMethod, DiscountType, Customer } from '@/types';
import { getPaymentMethodLabel, getPaymentMethodAlias, buildSalePaymentData, isInvoiceEligibleMethod } from '@/constants/payments';
import { SALE_SELLERS } from '@/constants/sellers';
import { formatCurrency } from '@/utils/format';
import { calculateChange } from '@/utils/discount';
import { normalizePhoneKey } from '@/utils/phone';
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
  const cart = useCart();
  const router = useRouter();
  const isEdit = mode === 'edit';

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [originalItems, setOriginalItems] = useState<SaleItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<SaleItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('single');
  const [selectedPayments, setSelectedPayments] = useState<PaymentMethod[]>([]);
  const [splitAmounts, setSplitAmounts] = useState<Partial<Record<PaymentMethod, string>>>({});
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [saleDate, setSaleDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCuit, setCustomerCuit] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [customerLookupHint, setCustomerLookupHint] = useState('');
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);

  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState('');

  const [amountPaid, setAmountPaid] = useState('');

  const [showExtraForm, setShowExtraForm] = useState(false);
  const [extraDescription, setExtraDescription] = useState('');
  const [extraQuantity, setExtraQuantity] = useState('1');
  const [extraPrice, setExtraPrice] = useState('');
  const [ticketSale, setTicketSale] = useState<SaleTicketData | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const selectedItems = isEdit ? editItems : cart.items;
  const setSelectedItems = isEdit ? setEditItems : cart.setItems;

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
        if (sale.paymentSplits && sale.paymentSplits.length === 2) {
          setPaymentMode('dual');
          setSelectedPayments(sale.paymentSplits.map((split) => split.method));
          setSplitAmounts(
            Object.fromEntries(
              sale.paymentSplits.map((split) => [split.method, String(split.amount)])
            ) as Partial<Record<PaymentMethod, string>>
          );
        } else {
          setPaymentMode('single');
          setSelectedPayments([sale.paymentMethod]);
        }
        setWantsInvoice(sale.wantsInvoice === true);
        setSaleDate(sale.date);
        setCustomerName(sale.customer.name);
        setCustomerEmail(sale.customer.email);
        setCustomerPhone(sale.customer.phone);
        setCustomerCuit(sale.customer.cuit ?? '');
        setSellerName(sale.createdByName ?? '');
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

  useEffect(() => {
    const phoneKey = normalizePhoneKey(customerPhone);
    if (!phoneKey) {
      setMatchedCustomer(null);
      setCustomerLookupHint('');
      return;
    }

    let active = true;
    setLookingUpCustomer(true);
    const timer = setTimeout(async () => {
      try {
        const found = await findCustomerByPhone(customerPhone);
        if (!active) return;
        if (found) {
          setMatchedCustomer(found);
          setCustomerName((current) => current.trim() || found.name);
          setCustomerEmail((current) => current.trim() || found.email);
          setCustomerCuit((current) => current.trim() || found.cuit || '');
          const stats = await fetchCustomerPurchaseStats(found.phone || customerPhone);
          if (!active) return;
          if (stats.saleCount > 0) {
            const top = stats.topProduct
              ? ` · Más compró: ${stats.topProduct.name}`
              : '';
            setCustomerLookupHint(
              `Cliente encontrado · ${stats.saleCount} compra(s) · Total ${formatCurrency(stats.totalSpent)}${top}`
            );
          } else {
            setCustomerLookupHint('Cliente registrado (sin compras previas)');
          }
        } else {
          setMatchedCustomer(null);
          setCustomerLookupHint('Cliente nuevo — se guardará con este teléfono');
        }
      } catch {
        if (active) {
          setMatchedCustomer(null);
          setCustomerLookupHint('');
        }
      } finally {
        if (active) setLookingUpCustomer(false);
      }
    }, 450);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerPhone]);

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
  const hasEfectivo = selectedPayments.includes('efectivo');
  const cashDue =
    paymentMode === 'dual'
      ? parseFloat((splitAmounts.efectivo ?? '0').replace(',', '.')) || 0
      : hasEfectivo
        ? total
        : 0;
  const canAskInvoice =
    paymentMode === 'single' && selectedPayments.some((method) => isInvoiceEligibleMethod(method));
  const paidAmount = parseFloat(amountPaid.replace(',', '.')) || 0;
  const change = cashDue > 0 ? calculateChange(paidAmount, cashDue) : 0;

  const addProduct = (product: Product) => {
    if (!isEdit) {
      cart.addProduct(product);
      setSearch('');
      setSelectedCategory(null);
      return;
    }

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

    if (!isEdit) {
      cart.updateQuantity(productId, quantity, getAvailableStock(productId));
      return;
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
    if (!isEdit) {
      cart.updateSubtotal(productId, newSubtotal);
      return;
    }
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
    if (!isEdit) {
      cart.removeItem(productId);
      return;
    }
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
    if (!isEdit) cart.clear();
    else setEditItems([]);
    setPaymentMode('single');
    setSelectedPayments([]);
    setSplitAmounts({});
    setWantsInvoice(false);
    setSaleDate(new Date());
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerCuit('');
    setMatchedCustomer(null);
    setCustomerLookupHint('');
    setDiscountType(null);
    setDiscountValue('');
    setAmountPaid('');
    resetExtraForm();
    loadProducts();
  };

  const buildSaleInput = () => {
    const date = new Date(saleDate);
    if (!isEdit) {
      const now = new Date();
      date.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const amounts =
      paymentMode === 'dual'
        ? selectedPayments.map(
            (method) => parseFloat((splitAmounts[method] ?? '0').replace(',', '.')) || 0
          )
        : undefined;
    const payment = buildSalePaymentData(selectedPayments, amounts, total);

    return {
    date,
    items: selectedItems,
    paymentMethod: payment.paymentMethod,
    paymentMethodLabel: payment.paymentMethodLabel,
    paymentSplits: payment.paymentSplits,
    customer: {
      name: customerName.trim(),
      email: customerEmail.trim(),
      phone: customerPhone.trim(),
      cuit: customerCuit.trim() || undefined,
    },
    subtotal,
    discountType: discountType ?? undefined,
    discountValue: parseFloat(discountValue.replace(',', '.')) || 0,
    discountAmount,
    total,
    amountPaid: hasEfectivo && cashDue > 0 ? paidAmount : undefined,
    change: hasEfectivo && cashDue > 0 ? change : undefined,
    createdBy: user!.uid,
    createdByName: sellerName.trim() || profile?.name,
    wantsInvoice: canAskInvoice && wantsInvoice,
  };
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      showAlert('Error', 'Agregá al menos un producto o extra');
      return;
    }
    if (!sellerName.trim()) {
      showAlert('Error', 'Seleccioná el vendedor');
      return;
    }
    if (selectedPayments.length === 0) {
      showAlert('Error', 'Seleccioná una forma de pago');
      return;
    }
    if (paymentMode === 'dual') {
      if (selectedPayments.length !== 2) {
        showAlert('Error', 'Elegí dos métodos de pago distintos');
        return;
      }
      const amounts = selectedPayments.map(
        (method) => parseFloat((splitAmounts[method] ?? '0').replace(',', '.')) || 0
      );
      const splitSum = amounts.reduce((sum, amount) => sum + amount, 0);
      if (Math.abs(splitSum - total) > 0.01) {
        showAlert('Error', 'La suma de los montos debe coincidir con el total de la venta');
        return;
      }
    }
    if (hasEfectivo && cashDue > 0 && paidAmount < cashDue) {
      showAlert('Error', 'El monto pagado en efectivo debe ser mayor o igual a la parte en efectivo');
      return;
    }
    if (canAskInvoice && wantsInvoice) {
      if (
        !customerPhone.trim() ||
        !customerName.trim() ||
        !customerEmail.trim() ||
        !customerCuit.trim()
      ) {
        showAlert('Error', 'Para factura completá teléfono, nombre, email y CUIT');
        return;
      }
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
        paymentSplits: input.paymentSplits,
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

      <SelectField
        label="Vendedor"
        value={sellerName}
        options={
          sellerName && !(SALE_SELLERS as readonly string[]).includes(sellerName)
            ? [sellerName, ...SALE_SELLERS]
            : [...SALE_SELLERS]
        }
        onChange={setSellerName}
        placeholder="Elegí quién vende"
      />

      <Text style={styles.sectionTitle}>Datos del cliente</Text>
      <Input
        label={wantsInvoice ? 'Teléfono *' : 'Teléfono (identificador)'}
        value={customerPhone}
        onChangeText={setCustomerPhone}
        placeholder="11 2345 6789"
        keyboardType="phone-pad"
      />
      {!!customerLookupHint && (
        <View style={styles.customerHint}>
          <MaterialIcons
            name={matchedCustomer ? 'person' : 'person-add'}
            size={16}
            color={matchedCustomer ? colors.primary : colors.textSecondary}
          />
          <Text style={styles.customerHintText}>
            {lookingUpCustomer ? 'Buscando cliente...' : customerLookupHint}
          </Text>
          {matchedCustomer && (
            <TouchableOpacity
              onPress={() => router.push(`/customer/${matchedCustomer.id}` as Href)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.customerHintLink}>Ver historial</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <Input
        label={wantsInvoice ? 'Nombre y apellido *' : 'Nombre y apellido'}
        value={customerName}
        onChangeText={setCustomerName}
        placeholder="Se completa si ya compró"
        autoCapitalize="words"
      />
      <Input
        label={wantsInvoice ? 'Email *' : 'Email (opcional)'}
        value={customerEmail}
        onChangeText={setCustomerEmail}
        placeholder="cliente@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
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
        mode={paymentMode}
        onModeChange={(mode) => {
          setPaymentMode(mode);
          if (mode === 'dual') {
            setWantsInvoice(false);
          }
          if (mode === 'single' && selectedPayments.length > 1) {
            setSelectedPayments([selectedPayments[0]]);
          }
          if (mode === 'single') {
            setSplitAmounts({});
          }
          if (mode === 'dual' && selectedPayments.length === 0) {
            setSelectedPayments([]);
          }
          if (
            mode === 'single' &&
            selectedPayments[0] &&
            !isInvoiceEligibleMethod(selectedPayments[0])
          ) {
            setWantsInvoice(false);
          }
        }}
        selected={selectedPayments}
        onChange={(methods) => {
          setSelectedPayments(methods);
          if (!methods.some((method) => isInvoiceEligibleMethod(method))) {
            setWantsInvoice(false);
          }
          if (!methods.includes('efectivo')) {
            setAmountPaid('');
          }
          setSplitAmounts((current) =>
            Object.fromEntries(
              methods.map((method) => [method, current[method] ?? ''])
            ) as Partial<Record<PaymentMethod, string>>
          );
        }}
        splitAmounts={splitAmounts}
        onSplitAmountChange={(method, amount) => {
          setSplitAmounts((current) => ({ ...current, [method]: amount }));
        }}
        total={total}
        amountPaid={amountPaid}
        onAmountPaidChange={setAmountPaid}
        cashChange={change}
        cashDue={cashDue}
      />

      {selectedPayments.map((method) => {
        const alias = getPaymentMethodAlias(method);
        if (!alias) return null;
        return (
          <View key={method} style={styles.aliasCard}>
            <Text style={styles.aliasLabel}>Alias {getPaymentMethodLabel(method)}</Text>
            <Text style={styles.aliasValue} selectable>
              {alias}
            </Text>
          </View>
        );
      })}

      {canAskInvoice ? (
        <>
          <Text style={styles.sectionTitle}>Factura</Text>
          <View style={styles.invoiceToggleRow}>
            <TouchableOpacity
              style={[styles.invoiceOption, !wantsInvoice && styles.invoiceOptionActive]}
              onPress={() => setWantsInvoice(false)}
            >
              <Text style={[styles.invoiceOptionText, !wantsInvoice && styles.invoiceOptionTextActive]}>
                Sin factura
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.invoiceOption, wantsInvoice && styles.invoiceOptionActive]}
              onPress={() => setWantsInvoice(true)}
            >
              <Text style={[styles.invoiceOptionText, wantsInvoice && styles.invoiceOptionTextActive]}>
                Con factura
              </Text>
            </TouchableOpacity>
          </View>
          {wantsInvoice ? (
            <>
              <Input
                label="CUIT / CUIL *"
                value={customerCuit}
                onChangeText={setCustomerCuit}
                placeholder="20-12345678-9"
                keyboardType="number-pad"
              />
              <Text style={styles.hint}>Queda pendiente en el panel admin para emitir.</Text>
            </>
          ) : null}
        </>
      ) : null}

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

      {paymentMode === 'single' && hasEfectivo && (
        <View style={styles.cashSection}>
          <View style={styles.cashRow}>
            <View style={styles.cashInput}>
              <Input
                label="El cliente paga con"
                value={amountPaid}
                onChangeText={setAmountPaid}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={styles.changeBox}>
              <Text style={styles.changeLabel}>Vuelto a dar</Text>
              <Text style={[styles.changeValue, change > 0 && styles.changeValuePositive]}>
                {formatCurrency(change)}
              </Text>
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
  customerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  customerHintText: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    flex: 1,
    minWidth: 140,
  },
  customerHintLink: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
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
  aliasCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  aliasLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  aliasValue: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
  },
  invoiceToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  invoiceOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  invoiceOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  invoiceOptionText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  invoiceOptionTextActive: {
    color: colors.white,
  },
  hint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
  changeValuePositive: {
    color: '#bbf7d0',
  },
  registerButton: {
    width: '100%',
  },
});
