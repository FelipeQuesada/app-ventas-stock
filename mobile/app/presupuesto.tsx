import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { DiscountType, PresupuestoItem, Product } from '@advance-coat/shared';
import {
  SALE_SELLERS,
  calculateDiscount,
  calculateSaleTotal,
  createExtraItem,
  formatCurrency,
  getUniqueProductCategories,
} from '@advance-coat/shared';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/SelectField';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SearchBar } from '@/components/ui/SearchBar';
import { LoadingScreen } from '@/components/ui/EmptyState';
import { PdfPreviewModal, PdfPreviewState } from '@/components/ui/PdfPreviewModal';
import { getProducts } from '@/services/products';
import { findCustomerByPhone } from '@/services/customers';
import {
  createPresupuesto,
  getPresupuesto,
  updatePresupuesto,
} from '@/services/presupuestos';
import {
  buildPresupuestoHtmlAsync,
  buildPresupuestoDocumentTitle,
  defaultValidUntil,
} from '@/services/presupuesto';
import { showAlert } from '@/utils/alert';
import { colors, radius, spacing, typography } from '@/constants/theme';

const CONTACT_DEFAULTS: Record<string, { phone: string; email: string }> = {
  Mateo: { phone: '+54 9 11 5171-4211', email: 'advancecoat.arg@gmail.com' },
  Joaquin: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Felipe: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Paula: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Martin: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
  Bruno: { phone: '+54 9 11 2162-6595', email: 'advancecoat.arg@gmail.com' },
};

function parseDateParam(value?: string): Date {
  if (!value) return new Date();
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function PresupuestoScreen() {
  const { edit, clientName: clientNameParam, clientPhone: clientPhoneParam } =
    useLocalSearchParams<{
      edit?: string;
      clientName?: string;
      clientPhone?: string;
    }>();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<PresupuestoItem[]>([]);
  const [date, setDate] = useState(new Date());
  const [validUntil, setValidUntil] = useState(() =>
    parseDateParam(defaultValidUntil(format(new Date(), 'yyyy-MM-dd')))
  );
  const [lockValidUntil, setLockValidUntil] = useState(false);
  const [contactName, setContactName] = useState('Mateo');
  const [contactPhone, setContactPhone] = useState(CONTACT_DEFAULTS.Mateo.phone);
  const [contactEmail, setContactEmail] = useState(CONTACT_DEFAULTS.Mateo.email);
  const [clientName, setClientName] = useState(clientNameParam ?? '');
  const [clientPhone, setClientPhone] = useState(clientPhoneParam ?? '');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCuit, setClientCuit] = useState('');
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [discountValue, setDiscountValue] = useState('');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraQty, setExtraQty] = useState('1');
  const [extraPrice, setExtraPrice] = useState('');
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getProducts();
        if (cancelled) return;
        setProducts(list);

        if (edit) {
          const existing = await getPresupuesto(edit);
          if (existing && !cancelled) {
            setLockValidUntil(true);
            setDate(existing.date);
            setValidUntil(existing.validUntil);
            setContactName(existing.contactName || 'Mateo');
            setContactPhone(existing.contactPhone || '');
            setContactEmail(existing.contactEmail || '');
            setClientName(existing.customer.name || '');
            setClientPhone(existing.customer.phone || '');
            setClientEmail(existing.customer.email || '');
            setClientCuit(existing.customer.cuit || '');
            setNotes(existing.notes || '');
            setItems(existing.items || []);
            setDiscountType(existing.discountType ?? null);
            setDiscountValue(
              existing.discountValue != null && existing.discountValue > 0
                ? String(existing.discountValue)
                : ''
            );
          } else if (!cancelled) {
            showAlert('Error', 'Presupuesto no encontrado');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [edit]);

  useEffect(() => {
    if (lockValidUntil) return;
    setValidUntil(parseDateParam(defaultValidUntil(format(date, 'yyyy-MM-dd'))));
  }, [date, lockValidUntil]);

  const searchTerm = search.toLowerCase().trim();
  const categories = useMemo(() => getUniqueProductCategories(products), [products]);
  const showBrowse = searchTerm.length > 0 || category !== null;

  const filteredProducts = useMemo(() => {
    if (!showBrowse) return [];
    return products
      .filter((p) => {
        if (p.hidden) return false;
        if (category && p.category !== category) return false;
        if (!searchTerm) return true;
        return (
          p.name.toLowerCase().includes(searchTerm) ||
          p.category.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 12);
  }, [products, searchTerm, category, showBrowse]);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = calculateDiscount(
    subtotal,
    discountType,
    Number(discountValue.replace(',', '.')) || 0
  );
  const total = calculateSaleTotal(subtotal, discountAmount);

  const applyContact = (name: string) => {
    setContactName(name);
    const defaults = CONTACT_DEFAULTS[name];
    if (defaults) {
      setContactPhone(defaults.phone);
      setContactEmail(defaults.email);
    }
  };

  const addProduct = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: item.unitPrice * (item.quantity + 1),
              }
            : item
        );
      }
      return [
        ...current,
        {
          id: product.id,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
        },
      ];
    });
    setSearch('');
    setCategory(null);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity, subtotal: item.unitPrice * quantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleAddExtra = () => {
    const qty = Number(extraQty) || 1;
    const price = Number(extraPrice.replace(',', '.'));
    if (!extraDesc.trim()) {
      showAlert('Error', 'Completá la descripción del extra');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showAlert('Error', 'Precio inválido');
      return;
    }
    const extra = createExtraItem(extraDesc.trim(), qty, price);
    setItems((current) => [
      ...current,
      {
        id: `extra-${Date.now()}`,
        productName: extra.productName,
        quantity: extra.quantity,
        unitPrice: extra.unitPrice,
        subtotal: extra.subtotal,
      },
    ]);
    setExtraDesc('');
    setExtraQty('1');
    setExtraPrice('');
  };

  const lookupCustomer = useCallback(async () => {
    if (!clientPhone.trim()) return;
    try {
      const found = await findCustomerByPhone(clientPhone);
      if (found) {
        setClientName(found.name || clientName);
        setClientEmail(found.email || clientEmail);
        if (found.cuit) setClientCuit(found.cuit);
      }
    } catch {
      // ignore
    }
  }, [clientPhone, clientName, clientEmail]);

  const buildPdfData = () => ({
    date: format(date, 'yyyy-MM-dd'),
    validUntil: format(validUntil, 'yyyy-MM-dd'),
    contactName,
    contactPhone,
    contactEmail,
    clientName: clientName.trim(),
    clientPhone: clientPhone.trim(),
    clientEmail: clientEmail.trim() || undefined,
    clientCuit: clientCuit.trim() || undefined,
    items,
    notes: notes.trim() || undefined,
    signerName: contactName,
    discountType,
    discountValue: Number(discountValue.replace(',', '.')) || 0,
    discountAmount,
  });

  const handlePreviewPdf = async () => {
    if (items.length === 0) {
      showAlert('Error', 'Agregá al menos un producto');
      return;
    }
    const html = await buildPresupuestoHtmlAsync(buildPdfData());
    setPdfPreview({
      html,
      title: buildPresupuestoDocumentTitle(clientName),
    });
  };

  const handleSave = async (withPdf: boolean) => {
    if (!user) return;
    if (!clientName.trim()) {
      showAlert('Error', 'El nombre del cliente es obligatorio');
      return;
    }
    if (items.length === 0) {
      showAlert('Error', 'Agregá al menos un producto');
      return;
    }

    setSaving(true);
    try {
      const input = {
        date,
        validUntil,
        contactName,
        contactPhone,
        contactEmail,
        customer: {
          name: clientName.trim(),
          phone: clientPhone.trim(),
          email: clientEmail.trim(),
          cuit: clientCuit.trim(),
        },
        items,
        notes: notes.trim() || undefined,
        discountType,
        discountValue: Number(discountValue.replace(',', '.')) || 0,
        discountAmount,
        createdBy: user.uid,
        createdByName: profile?.name,
      };

      const saved = edit
        ? await updatePresupuesto(edit, input)
        : await createPresupuesto(input);

      if (withPdf) {
        const html = await buildPresupuestoHtmlAsync(buildPdfData());
        setPdfPreview({
          html,
          title: buildPresupuestoDocumentTitle(saved.customer.name),
        });
      } else {
        showAlert('Guardado', 'Presupuesto guardado', [
          { text: 'OK', onPress: () => router.replace('/presupuesto-list') },
        ]);
      }
    } catch (err) {
      showAlert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <>
      <Stack.Screen options={{ title: edit ? 'Editar presupuesto' : 'Nuevo presupuesto' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.section}>Fechas</Text>
          <Text style={styles.fieldLabel}>Fecha</Text>
          <DatePickerField
            value={date}
            onChange={setDate}
            maximumDate={new Date(2100, 11, 31)}
          />
          <Text style={styles.fieldLabel}>Válido hasta</Text>
          <DatePickerField
            value={validUntil}
            onChange={(d) => {
              setLockValidUntil(true);
              setValidUntil(d);
            }}
            maximumDate={new Date(2100, 11, 31)}
          />

          <Text style={styles.section}>Contacto Advance Coat</Text>
          <SelectField
            label="Persona de contacto"
            value={contactName}
            options={[...SALE_SELLERS]}
            onChange={applyContact}
          />
          <Input label="Teléfono contacto" value={contactPhone} onChangeText={setContactPhone} />
          <Input label="Email contacto" value={contactEmail} onChangeText={setContactEmail} />

          <Text style={styles.section}>Cliente</Text>
          <Input label="Nombre *" value={clientName} onChangeText={setClientName} />
          <Input
            label="Teléfono (opcional)"
            value={clientPhone}
            onChangeText={setClientPhone}
            onBlur={() => void lookupCustomer()}
            keyboardType="phone-pad"
          />
          <Input label="Email (opcional)" value={clientEmail} onChangeText={setClientEmail} />
          <Input label="CUIT (opcional)" value={clientCuit} onChangeText={setClientCuit} />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Productos</Text>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar producto..." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cats}>
            <Pressable
              style={[styles.chip, !category && styles.chipActive]}
              onPress={() => setCategory(null)}
            >
              <Text style={[styles.chipText, !category && styles.chipTextActive]}>Todos</Text>
            </Pressable>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(category === cat ? null : cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {filteredProducts.map((p) => (
            <Pressable key={p.id} style={styles.productRow} onPress={() => addProduct(p)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{p.name}</Text>
                <Text style={styles.productMeta}>
                  {p.category} · {formatCurrency(p.price)}
                </Text>
              </View>
              <MaterialIcons name="add-circle" size={24} color={colors.primary} />
            </Pressable>
          ))}

          {items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.productMeta}>
                  {formatCurrency(item.unitPrice)} × {item.quantity} ={' '}
                  {formatCurrency(item.subtotal)}
                </Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <MaterialIcons name="remove" size={18} color={colors.text} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <MaterialIcons name="add" size={18} color={colors.text} />
                  </Pressable>
                </View>
              </View>
              <Pressable onPress={() => removeItem(item.id)}>
                <MaterialIcons name="delete" size={22} color={colors.danger} />
              </Pressable>
            </View>
          ))}

          <Text style={styles.section}>Ítem libre</Text>
          <Input label="Descripción" value={extraDesc} onChangeText={setExtraDesc} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Input label="Cant." value={extraQty} onChangeText={setExtraQty} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Precio"
                value={extraPrice}
                onChangeText={setExtraPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Button title="Agregar ítem libre" onPress={handleAddExtra} variant="outline" size="sm" />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.section}>Descuento</Text>
          <SelectField
            label="Tipo de descuento"
            value={
              discountType === 'percent'
                ? 'Porcentaje %'
                : discountType === 'fixed'
                  ? 'Monto fijo'
                  : 'Sin descuento'
            }
            options={['Sin descuento', 'Porcentaje %', 'Monto fijo']}
            onChange={(v) => {
              if (v === 'Porcentaje %') setDiscountType('percent');
              else if (v === 'Monto fijo') setDiscountType('fixed');
              else {
                setDiscountType(null);
                setDiscountValue('');
              }
            }}
          />
          {discountType ? (
            <Input
              label={discountType === 'percent' ? 'Porcentaje' : 'Monto'}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="decimal-pad"
            />
          ) : null}

          <Input
            label="Notas (opcional)"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <View style={styles.totals}>
            <Text style={styles.totalLine}>Subtotal: {formatCurrency(subtotal)}</Text>
            {discountAmount > 0 ? (
              <Text style={styles.discountLine}>Descuento: −{formatCurrency(discountAmount)}</Text>
            ) : null}
            <Text style={styles.totalFinal}>Total: {formatCurrency(total)}</Text>
          </View>
        </Card>

        <Button title="Vista previa PDF" onPress={() => void handlePreviewPdf()} variant="outline" />
        <Button
          title={edit ? 'Guardar cambios' : 'Guardar presupuesto'}
          onPress={() => void handleSave(false)}
          loading={saving}
          style={styles.saveBtn}
        />
        <Button
          title="Guardar y PDF"
          onPress={() => void handleSave(true)}
          loading={saving}
          variant="secondary"
        />
        <Button title="Ver historial" onPress={() => router.push('/presupuesto-list')} variant="outline" />
      </ScrollView>

      <PdfPreviewModal
        visible={!!pdfPreview}
        html={pdfPreview?.html ?? null}
        title={pdfPreview?.title}
        onClose={() => {
          setPdfPreview(null);
          router.replace('/presupuesto-list');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md, gap: spacing.sm },
  section: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  fieldLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cats: { marginVertical: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontFamily: 'Inter_600SemiBold' },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  productName: { ...typography.body, fontFamily: 'Inter_500Medium', color: colors.text },
  productMeta: { ...typography.caption, color: colors.textMuted },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { ...typography.body, fontFamily: 'Inter_600SemiBold', minWidth: 24, textAlign: 'center' },
  row2: { flexDirection: 'row', gap: spacing.sm },
  totals: { marginTop: spacing.sm, gap: 4 },
  totalLine: { ...typography.body, color: colors.textSecondary },
  discountLine: { ...typography.body, color: '#B45309' },
  totalFinal: { ...typography.h3, fontFamily: 'Inter_700Bold', color: colors.primary },
  saveBtn: { marginTop: spacing.sm, marginBottom: spacing.sm },
});
