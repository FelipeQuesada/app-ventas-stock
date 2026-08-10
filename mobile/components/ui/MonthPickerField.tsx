import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { format, parseISO, isValid, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, spacing, typography, radius } from '@/constants/theme';

interface MonthPickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  label?: string;
}

export function MonthPickerField({
  value,
  onChange,
  maximumDate = new Date(),
  label = 'Mes',
}: MonthPickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);
  const monthLabel = format(value, 'MMMM yyyy', { locale: es });

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.webInput}
          value={format(value, 'yyyy-MM')}
          onChangeText={(text) => {
            const parsed = parseISO(`${text}-01`);
            if (isValid(parsed) && parsed <= maximumDate) {
              onChange(startOfMonth(parsed));
            }
          }}
          // @ts-expect-error web month input
          type="month"
          max={format(maximumDate, 'yyyy-MM')}
        />
      </View>
    );
  }

  const openPicker = () => {
    setTempDate(value);
    setShowPicker(true);
  };

  const confirmDate = () => {
    onChange(startOfMonth(tempDate));
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.row} onPress={openPicker}>
        <MaterialIcons name="calendar-month" size={20} color={colors.textSecondary} />
        <Text style={styles.rowText}>
          {label}: {monthLabel}
        </Text>
        <MaterialIcons name="edit" size={18} color={colors.accent} />
      </TouchableOpacity>

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) onChange(startOfMonth(date));
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Elegir mes</Text>
                <TouchableOpacity onPress={confirmDate}>
                  <Text style={styles.modalConfirm}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                onChange={(_, date) => date && setTempDate(date)}
                locale="es-AR"
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
  },
  webInput: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    color: colors.text,
  },
  label: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  rowText: {
    ...typography.bodySmall,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.label,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  modalCancel: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  modalConfirm: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.accent,
  },
});
