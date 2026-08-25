import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { DailyCaja } from '@/types/caja';
import { formatCurrency, formatShortDate } from '@/utils/format';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface CajaListItemProps {
  caja: DailyCaja;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CajaListItem({ caja, onPress, onEdit, onDelete }: CajaListItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatShortDate(caja.date)}</Text>
          <Text style={styles.total}>{formatCurrency(caja.cajaTotal)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Ganancia: {formatCurrency(caja.ganancia)}</Text>
          <Text style={styles.meta}>Guardado: {formatCurrency(caja.totalGuardado)}</Text>
        </View>
        <Text style={styles.meta}>
          Cambio cierre: {formatCurrency(caja.cambioCierre)}
        </Text>
        {caja.closedByName ? (
          <Text style={styles.meta}>Cerró: {caja.closedByName}</Text>
        ) : null}
        {caja.sinMovimiento ? <Text style={styles.noMovement}>Sin movimiento</Text> : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onEdit();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="edit" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onDelete();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="delete-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>
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
  info: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  date: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  total: {
    ...typography.label,
    fontFamily: 'Inter_700Bold',
    color: colors.accent,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  meta: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    marginTop: 2,
  },
  noMovement: {
    ...typography.caption,
    fontFamily: 'Inter_600SemiBold',
    color: colors.success,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
  },
});
