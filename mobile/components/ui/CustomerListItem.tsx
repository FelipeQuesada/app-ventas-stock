import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Customer } from '@/types';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface CustomerListItemProps {
  customer: Customer;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onWhatsApp?: () => void;
  whatsAppDisabled?: boolean;
}

export function CustomerListItem({
  customer,
  onPress,
  onEdit,
  onDelete,
  onWhatsApp,
  whatsAppDisabled,
}: CustomerListItemProps) {
  const subtitle = [customer.email, customer.phone].filter(Boolean).join(' · ') || 'Sin contacto';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <MaterialIcons name="person" size={24} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {customer.name || 'Sin nombre'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        {whatsAppDisabled && (
          <Text style={styles.noPhone}>Sin teléfono</Text>
        )}
      </View>
      {onWhatsApp && (
        <TouchableOpacity
          style={[styles.waButton, whatsAppDisabled && styles.waButtonDisabled]}
          onPress={(event) => {
            event.stopPropagation?.();
            if (!whatsAppDisabled) onWhatsApp();
          }}
          disabled={whatsAppDisabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name="chat"
            size={20}
            color={whatsAppDisabled ? colors.textMuted : colors.white}
          />
          <Text style={[styles.waText, whatsAppDisabled && styles.waTextDisabled]}>
            Enviar
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={(event) => {
          event.stopPropagation?.();
          onEdit();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="edit" size={20} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={(event) => {
          event.stopPropagation?.();
          onDelete();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  noPhone: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 11,
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  waButtonDisabled: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waText: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.white,
    fontSize: 12,
  },
  waTextDisabled: {
    color: colors.textMuted,
  },
  iconButton: {
    padding: spacing.xs,
  },
});
