import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { colors, radius, spacing, typography } from '@/constants/theme';
import {
  PERIOD_PRESETS,
  PeriodPresetId,
  PeriodSelection,
  formatPeriodLabel,
  getPresetRange,
  normalizeRange,
} from '@/utils/datePeriod';

interface PeriodFilterProps {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
}

type Screen = 'presets' | 'calendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('presets');
  const [draftPreset, setDraftPreset] = useState<PeriodPresetId>(value.preset);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(value.range.start));
  const [rangeStart, setRangeStart] = useState<Date | null>(value.range.start);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(value.range.end);

  useEffect(() => {
    if (!open) return;
    setDraftPreset(value.preset);
    setScreen(value.preset === 'custom' ? 'calendar' : 'presets');
    setVisibleMonth(startOfMonth(value.range.start));
    setRangeStart(value.range.start);
    setRangeEnd(value.range.end);
  }, [open, value]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  const applyPreset = (preset: Exclude<PeriodPresetId, 'custom'>) => {
    const range = getPresetRange(preset);
    onChange({ preset, range });
    setOpen(false);
  };

  const applyCustomRange = () => {
    if (!rangeStart) return;
    const end = rangeEnd ?? rangeStart;
    const range = normalizeRange(rangeStart, end);
    onChange({ preset: 'custom', range });
    setOpen(false);
  };

  const handleDayPress = (day: Date) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day);
      setRangeEnd(null);
      setDraftPreset('custom');
      return;
    }

    setRangeEnd(day);
    setDraftPreset('custom');
  };

  const isInSelectedRange = (day: Date) => {
    if (!rangeStart) return false;
    const end = rangeEnd ?? rangeStart;
    const { start, end: rangeFinish } = normalizeRange(rangeStart, end);
    return (
      (isSameDay(day, start) || isAfter(day, start)) &&
      (isSameDay(day, rangeFinish) || isBefore(day, rangeFinish))
    );
  };

  const close = () => setOpen(false);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <View style={styles.triggerIcon}>
          <MaterialIcons name="date-range" size={20} color={colors.primary} />
        </View>
        <View style={styles.triggerTextWrap}>
          <Text style={styles.triggerLabel}>Período</Text>
          <Text style={styles.triggerValue} numberOfLines={1}>
            {formatPeriodLabel(value)}
          </Text>
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              {screen === 'calendar' ? (
                <TouchableOpacity onPress={() => setScreen('presets')} hitSlop={8}>
                  <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerSpacer} />
              )}
              <Text style={styles.sheetTitle}>Filtrar</Text>
              <TouchableOpacity onPress={close} hitSlop={8}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {screen === 'presets' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Período</Text>
                  <MaterialIcons name="keyboard-arrow-up" size={22} color={colors.primary} />
                </View>

                {PERIOD_PRESETS.map((preset) => {
                  const selected = draftPreset === preset.id;
                  return (
                    <TouchableOpacity
                      key={preset.id}
                      style={styles.presetRow}
                      onPress={() => applyPreset(preset.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.presetLabel}>{preset.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.otherRow}
                  onPress={() => {
                    setDraftPreset('custom');
                    setScreen('calendar');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetLabel}>Otro período</Text>
                  <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.calendarWrap}>
                <View style={styles.monthHeader}>
                  <Text style={styles.monthTitle}>
                    {format(visibleMonth, 'MMMM yyyy', { locale: es })}
                  </Text>
                  <View style={styles.monthNav}>
                    <TouchableOpacity
                      style={styles.navBtn}
                      onPress={() => setVisibleMonth((m) => subMonths(m, 1))}
                    >
                      <MaterialIcons name="chevron-left" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.navBtn}
                      onPress={() => setVisibleMonth((m) => addMonths(m, 1))}
                    >
                      <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAYS.map((day) => (
                    <Text key={day} style={styles.weekday}>
                      {day}
                    </Text>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {calendarDays.map((day) => {
                    const inMonth = isSameMonth(day, visibleMonth);
                    const start = rangeStart;
                    const end = rangeEnd ?? rangeStart;
                    const ordered =
                      start && end ? normalizeRange(start, end) : null;
                    const isStart = !!ordered && isSameDay(day, ordered.start);
                    const isEnd = !!ordered && isSameDay(day, ordered.end);
                    const inRange = isInSelectedRange(day);
                    const isEdge = isStart || isEnd;

                    return (
                      <Pressable
                        key={day.toISOString()}
                        style={[
                          styles.dayCell,
                          inRange && styles.dayInRange,
                          isStart && styles.dayRangeStart,
                          isEnd && styles.dayRangeEnd,
                        ]}
                        onPress={() => handleDayPress(day)}
                      >
                        <View style={[styles.dayInner, isEdge && styles.dayEdge]}>
                          <Text
                            style={[
                              styles.dayText,
                              !inMonth && styles.dayOutside,
                              isEdge && styles.dayEdgeText,
                            ]}
                          >
                            {format(day, 'd')}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.hint}>
                  {rangeStart && !rangeEnd
                    ? 'Elegí la fecha de fin'
                    : 'Tocá inicio y fin del período'}
                </Text>

                <TouchableOpacity
                  style={[styles.applyBtn, !rangeStart && styles.applyBtnDisabled]}
                  disabled={!rangeStart}
                  onPress={applyCustomRange}
                  activeOpacity={0.85}
                >
                  <Text style={styles.applyBtnText}>Aplicar período</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const ACCENT = '#4C6FFF';
const ACCENT_SOFT = '#E8EEFF';

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  triggerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTextWrap: {
    flex: 1,
  },
  triggerLabel: {
    ...typography.caption,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  triggerValue: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    textTransform: 'capitalize',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerSpacer: {
    width: 24,
  },
  sheetTitle: {
    ...typography.h2,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: ACCENT,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  presetLabel: {
    ...typography.body,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
    flex: 1,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: spacing.xs,
  },
  calendarWrap: {
    paddingBottom: spacing.xs,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthTitle: {
    ...typography.h3,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    textTransform: 'capitalize',
  },
  monthNav: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInRange: {
    backgroundColor: ACCENT_SOFT,
  },
  dayRangeStart: {
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
  },
  dayRangeEnd: {
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayEdge: {
    backgroundColor: ACCENT,
  },
  dayText: {
    fontSize: 15,
    lineHeight: 18,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  dayOutside: {
    color: colors.textMuted,
  },
  dayEdgeText: {
    color: colors.white,
    fontFamily: 'Inter_700Bold',
  },
  hint: {
    ...typography.caption,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  applyBtn: {
    marginTop: spacing.md,
    backgroundColor: ACCENT,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    opacity: 0.45,
  },
  applyBtnText: {
    ...typography.body,
    fontFamily: 'Inter_600SemiBold',
    color: colors.white,
  },
});
