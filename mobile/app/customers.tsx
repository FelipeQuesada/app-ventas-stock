import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
  Text,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SearchBar } from '@/components/ui/SearchBar';
import { CustomerListItem } from '@/components/ui/CustomerListItem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingScreen } from '@/components/ui/EmptyState';
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from '@/services/customers';
import { exportCustomersToExcel, buildCustomersPdfHtml } from '@/services/export';
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from '@/utils/saleTicket';
import { Customer } from '@/types';
import { showAlert, showConfirm } from '@/utils/alert';
import { PdfPreviewModal, PdfPreviewState } from '@/components/ui/PdfPreviewModal';
import { colors, radius, spacing, typography } from '@/constants/theme';

const emptyForm = { name: '', email: '', phone: '' };

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error(error);
      showAlert('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [loadCustomers])
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.toLowerCase().includes(term)
    );
  }, [customers, search]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, form);
        showAlert('Cliente actualizado', 'Los datos se guardaron correctamente');
      } else {
        await createCustomer(form);
        showAlert('Cliente registrado', 'El cliente fue agregado correctamente');
      }
      closeModal();
      loadCustomers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el cliente';
      showAlert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    const label = customer.name || customer.email || 'este cliente';
    const confirmed = await showConfirm('Eliminar cliente', `¿Eliminar a ${label}?`);
    if (!confirmed) return;

    try {
      await deleteCustomer(customer.id);
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      showAlert('Cliente eliminado', 'El cliente fue eliminado correctamente');
    } catch {
      showAlert('Error', 'No se pudo eliminar el cliente');
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportCustomersToExcel(customers);
      showAlert('Listo', 'Excel de clientes descargado');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar';
      showAlert('Error', message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (customers.length === 0) {
      showAlert('Error', 'No hay clientes para exportar');
      return;
    }
    setPdfPreview({
      html: buildCustomersPdfHtml(customers),
      title: 'Lista de clientes',
    });
  };

  const handleWhatsApp = async (customer: Customer) => {
    const phone = normalizeWhatsAppPhone(customer.phone);
    if (!phone) {
      showAlert('Sin teléfono', 'Este cliente no tiene un teléfono válido');
      return;
    }
    const text = broadcastMessage.trim();
    if (!text) {
      showAlert('Mensaje vacío', 'Escribí un mensaje para enviar a los clientes');
      return;
    }
    const url = buildWhatsAppUrl(customer.phone, text);
    try {
      await Linking.openURL(url);
    } catch {
      showAlert('Error', 'No se pudo abrir WhatsApp');
    }
  };

  if (loading) return <LoadingScreen />;

  const listHeader = (
    <View style={styles.headerSection}>
      <View style={styles.searchContainer}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar clientes..." />
      </View>

      <Card style={styles.exportCard}>
        <Text style={styles.sectionTitle}>Exportar</Text>
        <Text style={styles.sectionSubtitle}>Lista completa de clientes</Text>
        <View style={styles.exportActions}>
          <Button
            title="Excel"
            onPress={handleExportExcel}
            loading={exporting}
            variant="secondary"
            size="sm"
            style={styles.exportBtn}
          />
          <Button
            title="PDF"
            onPress={handleExportPdf}
            loading={exporting}
            variant="outline"
            size="sm"
            style={styles.exportBtn}
          />
        </View>
      </Card>

      <Card style={styles.broadcastCard}>
        <Text style={styles.sectionTitle}>Mensaje para clientes</Text>
        <Text style={styles.sectionSubtitle}>
          Escribí el texto y tocá Enviar en cada cliente con teléfono
        </Text>
        <Input
          value={broadcastMessage}
          onChangeText={setBroadcastMessage}
          placeholder="Ej: ¡Hola! Tenemos novedades en Advance Coat..."
          multiline
          numberOfLines={3}
          style={styles.messageInput}
        />
      </Card>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => {
          const hasPhone = !!normalizeWhatsAppPhone(item.phone);
          return (
            <CustomerListItem
              customer={item}
              onPress={() => router.push(`/customer/${item.id}` as Href)}
              onEdit={() => openEditModal(item)}
              onDelete={() => handleDelete(item)}
              onWhatsApp={() => handleWhatsApp(item)}
              whatsAppDisabled={!hasPhone}
            />
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title="No hay clientes"
            subtitle="Tocá + para agregar el primero"
          />
        }
      />

      <TouchableOpacity style={styles.fab} onPress={openCreateModal} activeOpacity={0.8}>
        <MaterialIcons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Pressable style={styles.modal} onPress={() => undefined}>
            <Input
              label="Nombre"
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              placeholder="Nombre y apellido"
              autoCapitalize="words"
            />
            <Input
              label="Email"
              value={form.email}
              onChangeText={(email) => setForm((current) => ({ ...current, email }))}
              placeholder="cliente@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
              placeholder="11 1234-5678"
              keyboardType="phone-pad"
            />
            <View style={styles.modalActions}>
              <Button title="Cancelar" variant="outline" onPress={closeModal} style={styles.actionButton} />
              <Button
                title={editingCustomer ? 'Guardar' : 'Agregar'}
                onPress={handleSave}
                loading={saving}
                style={styles.actionButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <PdfPreviewModal
        visible={!!pdfPreview}
        html={pdfPreview?.html ?? null}
        title={pdfPreview?.title}
        onClose={() => setPdfPreview(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSection: {
    marginBottom: spacing.sm,
  },
  searchContainer: {
    paddingBottom: spacing.sm,
  },
  exportCard: {
    marginBottom: spacing.sm,
  },
  broadcastCard: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  exportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  exportBtn: {
    flex: 1,
  },
  messageInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  list: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
