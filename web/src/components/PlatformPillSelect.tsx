import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export type PillSelectOption<T extends string> = {
  value: T;
  label: string;
  tone?: string;
};

type Props<T extends string> = {
  value: T;
  options: PillSelectOption<T>[];
  disabled?: boolean;
  ariaLabel: string;
  toneClass: string;
  onChange: (value: T) => void;
};

export function PlatformPillSelect<T extends string>({
  value,
  options,
  disabled,
  ariaLabel,
  toneClass,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={`platform-pill ${toneClass}${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="platform-pill-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden />
      </button>

      {open ? (
        <ul id={listId} className="platform-pill-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`platform-pill-option${isSelected ? ' is-selected' : ''}${
                    option.tone ? ` ${option.tone}` : ''
                  }`}
                  onClick={() => {
                    setOpen(false);
                    if (option.value !== value) onChange(option.value);
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected ? <Check size={14} strokeWidth={2.6} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
