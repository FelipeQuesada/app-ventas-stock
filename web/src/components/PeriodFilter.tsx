import { useEffect, useMemo, useState } from 'react';
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
import { ArrowLeft, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  PERIOD_PRESETS,
  formatPeriodLabel,
  getPresetRange,
  normalizeRange,
  type PeriodPresetId,
  type PeriodSelection,
} from '@advance-coat/shared';

interface PeriodFilterProps {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
}

type Screen = 'presets' | 'calendar';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>('presets');
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value.range.start));
  const [rangeStart, setRangeStart] = useState<Date | null>(value.range.start);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(value.range.end);

  useEffect(() => {
    if (!open) return;
    setScreen(value.preset === 'custom' ? 'calendar' : 'presets');
    setVisibleMonth(startOfMonth(value.range.start));
    setRangeStart(value.range.start);
    setRangeEnd(value.range.end);
  }, [open, value]);

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  const orderedRange = useMemo(() => {
    if (!rangeStart) return null;
    return normalizeRange(rangeStart, rangeEnd ?? rangeStart);
  }, [rangeStart, rangeEnd]);

  function applyPreset(preset: Exclude<PeriodPresetId, 'custom'>) {
    onChange({ preset, range: getPresetRange(preset) });
    setOpen(false);
  }

  function applyCustom() {
    if (!orderedRange) return;
    onChange({ preset: 'custom', range: orderedRange });
    setOpen(false);
  }

  function handleDayClick(day: Date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(day);
      setRangeEnd(null);
      return;
    }
    setRangeEnd(day);
  }

  function isInRange(day: Date) {
    if (!orderedRange) return false;
    const { start, end } = orderedRange;
    return (isSameDay(day, start) || isAfter(day, start)) && (isSameDay(day, end) || isBefore(day, end));
  }

  return (
    <>
      <button type="button" className="period-trigger" onClick={() => setOpen(true)}>
        <span className="period-trigger-icon">
          <CalendarRange size={20} />
        </span>
        <span className="period-trigger-text">
          <span className="period-trigger-label">Período</span>
          <span className="period-trigger-value">{formatPeriodLabel(value)}</span>
        </span>
        <ChevronDown size={20} className="period-trigger-chevron" />
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card period-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="period-sheet-header">
              {screen === 'calendar' ? (
                <button
                  type="button"
                  className="period-icon-btn"
                  onClick={() => setScreen('presets')}
                  aria-label="Volver"
                >
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <span className="period-icon-btn period-icon-spacer" />
              )}
              <h3 className="period-sheet-title">Filtrar</h3>
              <button
                type="button"
                className="period-icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            {screen === 'presets' ? (
              <>
                <div className="period-section-header">
                  <span>Período</span>
                </div>

                {PERIOD_PRESETS.map((preset) => {
                  const selected = value.preset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className="period-option"
                      onClick={() => applyPreset(preset.id)}
                    >
                      <span className={`period-radio ${selected ? 'selected' : ''}`} />
                      <span>{preset.label}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  className="period-option period-option-other"
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                    setVisibleMonth(startOfMonth(new Date()));
                    setScreen('calendar');
                  }}
                >
                  <span>Otro período</span>
                  <ChevronRight size={20} />
                </button>
              </>
            ) : (
              <>
                <div className="period-month-header">
                  <span className="period-month-title">
                    {format(visibleMonth, 'MMMM yyyy', { locale: es })}
                  </span>
                  <div className="period-month-nav">
                    <button
                      type="button"
                      className="period-nav-btn"
                      onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
                      aria-label="Mes anterior"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      className="period-nav-btn"
                      onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                      aria-label="Mes siguiente"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="period-weekdays">
                  {WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div className="period-days">
                  {calendarDays.map((day) => {
                    const inMonth = isSameMonth(day, visibleMonth);
                    const isStart = !!orderedRange && isSameDay(day, orderedRange.start);
                    const isEnd = !!orderedRange && isSameDay(day, orderedRange.end);
                    const edge = isStart || isEnd;
                    const classes = [
                      'period-day',
                      isInRange(day) ? 'in-range' : '',
                      isStart ? 'range-start' : '',
                      isEnd ? 'range-end' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        className={classes}
                        onClick={() => handleDayClick(day)}
                      >
                        <span
                          className={`period-day-inner ${edge ? 'edge' : ''} ${
                            inMonth ? '' : 'outside'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="period-hint">
                  {rangeStart && !rangeEnd
                    ? 'Elegí la fecha de fin'
                    : 'Tocá inicio y fin del período'}
                </p>

                <button
                  type="button"
                  className="btn btn-primary period-apply-btn"
                  disabled={!rangeStart}
                  onClick={applyCustom}
                >
                  Aplicar período
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
