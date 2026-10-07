export type UserRole = 'admin' | 'employee';

export type PaymentMethod =
  | 'transferencia_feli'
  | 'transferencia_mateo'
  | 'transferencia_paula'
  | 'efectivo'
  | 'debito'
  | 'credito'
  | 'qr'
  | 'transferencia'
  | 'mercado_pago';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active?: boolean;
  createdAt?: Date;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  /** ID del producto en Tiendanube (para sincronización) */
  tiendanubeId?: number;
  /** ID de la variante por defecto en Tiendanube */
  tiendanubeVariantId?: number;
  /**
   * Oculto en catálogo/ventas (no se borra).
   * Se marca cuando el producto ya no existe en Tiendanube.
   */
  hidden?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: string;
  /** Unidades de stock que descuenta esta línea */
  quantity: number;
  /** Precio unitario ya con el descuento de la línea */
  unitPrice: number;
  subtotal: number;
  isExtra?: boolean;
  /** Identifica la línea cuando el mismo producto va en caja y en unidades */
  lineId?: string;
  wholesaleOfferId?: string;
  /** pack cuenta para el escalón; unit es una unidad suelta del mismo mayorista */
  wholesaleMode?: 'pack' | 'unit';
  /** Cajas o packs, cuando la línea es un múltiplo exacto */
  packQuantity?: number;
  unitsPerPack?: number;
  /** Precio de lista por unidad, antes del descuento de la línea */
  listUnitPrice?: number;
  /** Descuento de esta línea. En mayorista lo define la cantidad de cajas o packs */
  lineDiscountPercent?: number;
}

export interface SaleCustomer {
  name: string;
  email: string;
  phone: string;
  /** CUIT/CUIL — requerido si pide factura */
  cuit?: string;
}

export interface Customer extends SaleCustomer {
  id: string;
  createdAt?: Date;
}

export type DiscountType = 'percent' | 'fixed';

/** Monto cobrado con un método de pago (venta con dos formas de pago) */
export interface SalePaymentSplit {
  method: PaymentMethod;
  amount: number;
  paymentMethodLabel?: string;
}

export interface Sale {
  id: string;
  date: Date;
  items: SaleItem[];
  paymentMethod: PaymentMethod;
  paymentMethodLabel?: string;
  /** Detalle cuando se cobró con dos métodos */
  paymentSplits?: SalePaymentSplit[];
  customer: SaleCustomer;
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  amountPaid?: number;
  change?: number;
  customerCount: number;
  /** El cliente pidió factura */
  wantsInvoice?: boolean;
  /** Admin ya emitió / gestionó la factura */
  invoiceIssued?: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

/** Ítem de un presupuesto (no afecta stock) */
export interface PresupuestoItem {
  id: string;
  productId?: string;
  productName: string;
  /** Unidades de stock. En un pack mayorista es cajas × unidades por caja. */
  quantity: number;
  unitPrice: number;
  subtotal: number;
  wholesaleOfferId?: string;
  wholesaleMode?: 'pack' | 'unit';
  packQuantity?: number;
  unitsPerPack?: number;
  listUnitPrice?: number;
  lineDiscountPercent?: number;
}

/** Presupuesto guardado (PDF + historial por cliente) */
export interface Presupuesto {
  id: string;
  date: Date;
  validUntil: Date;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  customer: SaleCustomer;
  /** Id en colección customers cuando se pudo vincular */
  customerId?: string;
  items: PresupuestoItem[];
  notes?: string;
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

export type StockLevel = 'high' | 'low' | 'empty';
