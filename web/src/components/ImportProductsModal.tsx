import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { deleteAllProducts } from '../services/products';
import {
  importProducts,
  parseProductsWorkbook,
  readWorkbookFromFile,
} from '../services/importProducts';

interface ImportProductsModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportProductsModal({ open, onClose, onImported }: ImportProductsModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const busy = importing || deleting;

  if (!open) return null;

  async function processFile(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
      window.alert('Subí un archivo Excel (.xlsx, .xls) o CSV.');
      return;
    }

    setImporting(true);
    try {
      const workbook = await readWorkbookFromFile(file);
      const { rows, errors: parseErrors } = parseProductsWorkbook(workbook);
      const result = await importProducts(rows);
      const allErrors = [...parseErrors, ...result.errors];

      onImported();
      onClose();

      const lines = [
        `Nuevos: ${result.created}`,
        `Actualizados (precio/stock): ${result.updated}`,
        `Sin cambios: ${result.unchanged}`,
      ];
      if (allErrors.length > 0) {
        const preview = allErrors
          .slice(0, 5)
          .map((error) => `Fila ${error.row}: ${error.message}`)
          .join('\n');
        lines.push(`\n${allErrors.length} fila(s) con problemas:\n${preview}`);
        if (allErrors.length > 5) {
          lines.push(`\n... y ${allErrors.length - 5} más`);
        }
      }
      window.alert(lines.join(''));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo importar el archivo');
    } finally {
      setImporting(false);
      setDragging(false);
    }
  }

  async function handleDeleteAll() {
    if (
      !window.confirm(
        'Se van a borrar todos los productos de la base. Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const count = await deleteAllProducts();
      onImported();
      window.alert(`Se eliminaron ${count} producto(s).`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudieron eliminar los productos');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            Importar productos
          </h3>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <p className="muted" style={{ marginTop: 0 }}>
          Subí un Excel o CSV de Tienda Nube. Si el producto ya existe (mismo nombre), se actualiza
          solo precio y stock. Las ventas hechas no se tocan.
        </p>

        <div
          className={`import-dropzone ${dragging ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && !busy) void processFile(file);
          }}
        >
          {busy ? (
            <p>{deleting ? 'Eliminando productos…' : 'Importando productos…'}</p>
          ) : (
            <>
              <Upload size={36} />
              <strong>Arrastrá tu Excel acá</strong>
              <span className="muted">.xlsx, .xls o .csv</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => inputRef.current?.click()}
              >
                Seleccionar archivo
              </button>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void processFile(file);
          }}
        />

        <div className="import-example">
          <strong>Ejemplo de columnas</strong>
          <p className="muted">nombre | categoria | precio | stock</p>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%', color: '#EF4444' }}
          onClick={() => void handleDeleteAll()}
          disabled={busy}
        >
          {deleting ? 'Eliminando…' : 'Eliminar todos los productos'}
        </button>
      </div>
    </div>
  );
}
