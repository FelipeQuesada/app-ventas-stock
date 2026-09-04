import { X } from 'lucide-react';
import type { SaleTicketData } from '@advance-coat/shared';
import {
  formatCurrency,
  formatDate,
  getSalePaymentLabel,
  buildSaleTicketText,
  buildSaleGroupText,
  buildSaleTicketHtml,
  buildWhatsAppUrl,
} from '@advance-coat/shared';
import { printHtml } from '../services/export';

type Props = {
  sale: SaleTicketData | null;
  title?: string;
  onClose: () => void;
};

export function SaleTicketModal({ sale, title = 'Venta registrada', onClose }: Props) {
  if (!sale) return null;

  function openWhatsApp(text: string, phone?: string) {
    window.open(buildWhatsAppUrl(phone, text), '_blank');
  }

  async function copyText(text: string, label = 'Mensaje copiado') {
    try {
      await navigator.clipboard.writeText(text);
      window.alert(label);
    } catch {
      window.alert('No se pudo copiar el mensaje');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card sale-ticket-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sale-ticket-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button type="button" className="btn btn-icon btn-ghost" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="sale-ticket-preview">
          <p className="sale-ticket-brand">Advance Coat</p>
          <p className="muted" style={{ textAlign: 'center', margin: '4px 0 0' }}>
            {formatDate(sale.date)}
          </p>
          {sale.createdByName ? (
            <p className="muted" style={{ textAlign: 'center', margin: '2px 0 0' }}>
              Vendedor: {sale.createdByName}
            </p>
          ) : null}

          <div className="sale-ticket-divider" />

          {sale.items.map((item, index) => (
            <div className="sale-ticket-item" key={`${item.productId}-${index}`}>
              <div>
                <strong>{item.productName}</strong>
                <div className="muted">
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </div>
              </div>
              <strong>{formatCurrency(item.subtotal)}</strong>
            </div>
          ))}

          <div className="sale-ticket-divider" />

          <div className="sale-ticket-summary">
            <div className="row">
              <span className="muted">Subtotal</span>
              <strong>{formatCurrency(sale.subtotal)}</strong>
            </div>
            {(sale.discountAmount ?? 0) > 0 ? (
              <div className="row">
                <span className="muted">Descuento</span>
                <strong style={{ color: 'var(--success)' }}>
                  -{formatCurrency(sale.discountAmount ?? 0)}
                </strong>
              </div>
            ) : null}
            <div className="row sale-ticket-total">
              <span>Total</span>
              <strong>{formatCurrency(sale.total)}</strong>
            </div>
            <div className="row">
              <span className="muted">Pago</span>
              <strong>{getSalePaymentLabel(sale)}</strong>
            </div>
          </div>
        </div>

        <div className="sale-ticket-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => openWhatsApp(buildSaleTicketText(sale), sale.customer?.phone)}
          >
            WhatsApp
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void copyText(buildSaleGroupText(sale), 'Mensaje de grupo copiado')}
          >
            Grupo
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => printHtml(buildSaleTicketHtml(sale))}
          >
            PDF
          </button>
        </div>
        <div className="sale-ticket-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => void copyText(buildSaleTicketText(sale), 'Presupuesto copiado')}
          >
            Copiar presupuesto
          </button>
        </div>
        <button type="button" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          Listo
        </button>
      </div>
    </div>
  );
}
