import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function toIso(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function parseValue(value: string): Date {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const selected = useMemo(() => parseValue(value), [value]);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selected));

  useEffect(() => {
    if (!open) return;
    setVisibleMonth(startOfMonth(selected));
  }, [open, selected]);

  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [visibleMonth]);

  const displayValue = format(selected, "EEEE d 'de' MMMM yyyy", { locale: es });

  function pickDay(day: Date) {
    onChange(toIso(day));
    setOpen(false);
  }

  return (
    <div className="field date-field">
      <label>{label}</label>
      <button type="button" className="date-field-trigger" onClick={() => setOpen(true)}>
        <span className="date-field-trigger-icon">
          <Calendar size={18} />
        </span>
        <span className="date-field-trigger-value">{displayValue}</span>
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-card period-sheet date-field-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="period-sheet-header">
              <span className="period-icon-btn period-icon-spacer" />
              <h3 className="period-sheet-title">{label}</h3>
              <button
                type="button"
                className="period-icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

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
                const isSelected = isSameDay(day, selected);
                const isToday = isSameDay(day, new Date());
                const classes = [
                  'period-day',
                  isSelected ? 'range-start range-end' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={classes}
                    onClick={() => pickDay(day)}
                  >
                    <span
                      className={[
                        'period-day-inner',
                        isSelected ? 'edge' : '',
                        !inMonth ? 'outside' : '',
                        !isSelected && isToday ? 'date-field-today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {format(day, 'd')}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="date-field-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onChange(toIso(new Date()));
                  setOpen(false);
                }}
              >
                Hoy
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
