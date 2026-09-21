import { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { printHtml } from '../services/export';

export type PdfPreviewState = {
  html: string;
  title: string;
} | null;

type Props = {
  open: boolean;
  html: string | null;
  title?: string;
  onClose: () => void;
};

export function PdfPreviewModal({
  open,
  html,
  title = 'Vista previa PDF',
  onClose,
}: Props) {
  const [printing, setPrinting] = useState(false);

  if (!open || !html) return null;

  function handlePrint() {
    if (!html) return;
    setPrinting(true);
    try {
      printHtml(html, title);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'No se pudo abrir la impresión');
    } finally {
      setPrinting(false);
    }
  }

  function handleDownload() {
    if (!html) return;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^\w\-]+/g, '_').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-overlay pdf-preview-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-preview-header">
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>
              Vista previa
            </h3>
            <p className="card-subtitle" style={{ margin: '4px 0 0' }}>
              {title}
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="pdf-preview-frame-wrap">
          <iframe title={title} className="pdf-preview-frame" srcDoc={html} />
        </div>

        <div className="pdf-preview-actions">
          <button type="button" className="btn btn-ghost" onClick={handleDownload}>
            <Download size={16} /> Descargar HTML
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint} disabled={printing}>
            <Printer size={16} /> {printing ? 'Abriendo…' : 'Imprimir / Guardar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
