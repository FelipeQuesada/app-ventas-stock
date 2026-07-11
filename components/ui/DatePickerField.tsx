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
import { format, parseISO, isValid } from 'date-fns';
import { formatShortDate } from '@/utils/format';
import { colors, spacing, typography, radius } from '@/constants/theme';

interface DatePickerFieldProps {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
}

export function DatePickerField({ value, onChange, maximumDate = new Date() }: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.label}>Fecha</Text>
        <TextInput
          style={styles.webInput}
          value={format(value, 'yyyy-MM-dd')}
          onChangeText={(text) => {
            const parsed = parseISO(text);
            if (isValid(parsed) && parsed <= maximumDate) {
              onChange(parsed);
            }
          }}
          // @ts-expect-error web date input
          type="date"
          max={format(maximumDate, 'yyyy-MM-dd')}
        />
      </View>
    );
  }

  const openPicker = () => {
    setTempDate(value);
    setShowPicker(true);
  };

  const confirmDate = () => {
    onChange(tempDate);
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.dateRow} onPress={openPicker}>
        <MaterialIcons name="event" size={20} color={colors.textSecondary} />
        <Text style={styles.dateText}>Fecha: {formatShortDate(value)}</Text>
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
            if (date) onChange(date);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Elegir fecha</Text>
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
    marginBottom: spacing.md,
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
    ...typography.label,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  dateText: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
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
