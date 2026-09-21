import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, FileUp, MapPin, Package, Truck, Upload, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FLEX_ALL_LOCALITIES,
  FLEX_ZONE_LABELS,
  buildFlexImportRows,
  formatCurrency,
  type FlexLabelParsed,
  type FlexLabelsParseResult,
  type FlexZoneId,
} from '@advance-coat/shared';
import { parseFlexLabelsPdf } from '../services/importFlexLabels';
import { addFlexShipmentsBatch } from '../services/flex';

interface ImportFlexLabelsModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (info: { rows: number; packages: number; firstDate: Date | null }) => void;
  referenceYear: number;
  createdBy: string;
  createdByName?: string;
}

function FlexImportLoader({ label, fileName }: { label: string; fileName?: string }) {
  return (
    <div className="flex-import-loader" aria-live="polite" aria-busy="true">
      <div className="flex-import-loader-stage">
        <motion.div
          className="flex-import-loader-glow"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.92, 1.05, 0.92] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="flex-import-loader-card">
          <div className="flex-import-loader-lines" aria-hidden>
            <span />
            <span />
            <span />
            <span />
          </div>
          <motion.div
            className="flex-import-loader-scan"
            animate={{ top: ['8%', '78%', '8%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="flex-import-loader-pin"
            animate={{ y: [0, -4, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <MapPin size={16} />
          </motion.div>
        </div>
        <motion.div
          className="flex-import-loader-truck"
          animate={{ x: [-18, 18, -18] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Truck size={22} />
        </motion.div>
      </div>
      <p className="flex-import-loader-title">{label}</p>
      {fileName ? <p className="flex-import-loader-file">{fileName}</p> : null}
      <div className="flex-import-loader-dots" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function ImportFlexLabelsModal({
  open,
  onClose,
  onImported,
  referenceYear,
  createdBy,
  createdByName,
}: ImportFlexLabelsModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<FlexLabelsParseResult | null>(null);
  const [overrides, setOverrides] = useState<Record<number, string>>({});

  const { matched, unmatched } = useMemo(() => {
    if (!parsed) return { matched: [], unmatched: [] as FlexLabelParsed[] };
    return buildFlexImportRows(parsed.labels, overrides);
  }, [parsed, overrides]);

  const totalPackages = matched.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = matched.reduce((sum, row) => sum + row.total, 0);

  function reset() {
    setParsed(null);
    setOverrides({});
    setFileName('');
    setDragging(false);
    setParsing(false);
    setSaving(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleClose() {
    if (saving || parsing) return;
    reset();
    onClose();
  }

  async function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      window.alert('Subí el PDF de etiquetas de Mercado Libre (.pdf).');
      return;
    }
    setParsing(true);
    setFileName(file.name);
    try {
      const result = await parseFlexLabelsPdf(file, { referenceYear });
      setParsed(result);
      setOverrides({});
    } catch (err) {
      setParsed(null);
      window.alert(err instanceof Error ? err.message : 'No se pudo leer el PDF');
    } finally {
      setParsing(false);
      setDragging(false);
    }
  }

  async function handleConfirm() {
    if (matched.length === 0) {
      window.alert('No hay etiquetas reconocidas para importar.');
      return;
    }
    if (unmatched.length > 0) {
      const ok = window.confirm(
        `Hay ${unmatched.length} etiqueta(s) sin reconocer que no se van a importar. ¿Continuar con las ${totalPackages} reconocidas?`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await addFlexShipmentsBatch(
        matched.map((row) => ({
          date: row.date,
          zone: row.zone as FlexZoneId,
          locality: row.locality,
          quantity: row.quantity,
        })),
        { createdBy, createdByName }
      );
      const firstDate = matched[0]?.date ?? null;
      reset();
      onImported({ rows: matched.length, packages: totalPackages, firstDate });
      onClose();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="modal-overlay flex-import-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Importar etiquetas Flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            className="modal-card flex-import-modal"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div className="flex-import-header">
              <div className="flex-import-header-icon" aria-hidden>
                <Package size={20} />
              </div>
              <div className="flex-import-header-text">
                <h3>Importar etiquetas ML</h3>
                <p>Detectamos lugar, zona y fecha automáticamente</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm flex-import-close"
                onClick={handleClose}
                disabled={saving || parsing}
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {parsing || saving ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <FlexImportLoader
                    label={parsing ? 'Leyendo etiquetas…' : 'Guardando envíos…'}
                    fileName={fileName || undefined}
                  />
                </motion.div>
              ) : !parsed ? (
                <motion.div
                  key="drop"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`flex-import-drop${dragging ? ' is-dragging' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) void processFile(file);
                    }}
                  >
                    <div className="flex-import-drop-icon" aria-hidden>
                      <FileUp size={26} />
                    </div>
                    <div className="flex-import-drop-copy">
                      <strong>Arrastrá el PDF acá</strong>
                      <span>o elegilo desde tu computadora</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => inputRef.current?.click()}
                    >
                      <Upload size={16} /> Elegir PDF
                    </button>
                    <p className="flex-import-drop-hint">Archivo de etiquetas Flex de Mercado Libre</p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void processFile(file);
                      }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="flex-import-results"
                >
                  <div className="flex-import-filechip">
                    <FileUp size={14} />
                    <span className="flex-import-filechip-name">{fileName}</span>
                    <span className="muted">
                      {parsed.totalLabels} etiq. · {parsed.totalPages} pág. · {matched.length} grupos
                    </span>
                  </div>

                  {matched.length > 0 && (
                    <div className="flex-import-summary">
                      <div className="flex-import-summary-item">
                        <span className="muted">Paquetes</span>
                        <strong>{totalPackages}</strong>
                      </div>
                      <div className="flex-import-summary-item">
                        <span className="muted">Total</span>
                        <strong>{formatCurrency(totalAmount)}</strong>
                      </div>
                      {unmatched.length > 0 ? (
                        <div className="flex-import-summary-item warn">
                          <span className="muted">Sin reconocer</span>
                          <strong>{unmatched.length}</strong>
                        </div>
                      ) : (
                        <div className="flex-import-summary-item ok">
                          <CheckCircle2 size={16} />
                          <strong>Todo OK</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex-import-list">
                    {matched.map((row, index) => (
                      <motion.div
                        key={row.key}
                        className="flex-import-row ok"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.04, 0.3) }}
                      >
                        <div className="flex-import-row-badge ok" aria-hidden>
                          <CheckCircle2 size={14} />
                        </div>
                        <div>
                          <strong>
                            {format(row.date, 'dd/MM/yyyy', { locale: es })} · {row.locality}
                          </strong>
                          <div className="muted">
                            {FLEX_ZONE_LABELS[row.zone]} · ×{row.quantity} · {formatCurrency(row.total)}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {unmatched.map((label, index) => (
                      <motion.div
                        key={`u-${label.pageIndex}`}
                        className="flex-import-row warn"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min((matched.length + index) * 0.04, 0.4) }}
                      >
                        <div className="flex-import-row-badge warn" aria-hidden>
                          <AlertTriangle size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong>
                            Etiqueta {label.labelIndex + 1}
                            <span className="muted"> · pág. {label.sourcePage}</span>
                          </strong>
                          <div className="muted">
                            {label.rawLocality || 'Sin localidad'}
                            {!label.date ? ' · sin fecha FLEX' : ''}
                          </div>
                          {label.date ? (
                            <select
                              className="input"
                              style={{ marginTop: 8 }}
                              value={overrides[label.pageIndex] ?? ''}
                              onChange={(e) =>
                                setOverrides((prev) => ({
                                  ...prev,
                                  [label.pageIndex]: e.target.value,
                                }))
                              }
                            >
                              <option value="">Asignar lugar…</option>
                              {FLEX_ALL_LOCALITIES.map((loc) => (
                                <option key={loc} value={loc}>
                                  {loc}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
                              No se pudo leer la fecha de esta etiqueta
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex-import-actions">
                    <button type="button" className="btn btn-ghost" onClick={reset}>
                      Otro archivo
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={matched.length === 0}
                      onClick={() => void handleConfirm()}
                    >
                      <Package size={16} /> Importar {totalPackages || ''}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
