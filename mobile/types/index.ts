export type BrandRole = 'owner' | 'admin' | 'employee';
export type PlatformRole = 'super_admin';
export type UserRole = BrandRole | PlatformRole;

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
  brandId?: string | null;
  photoUrl?: string;
  active?: boolean;
  pendingApproval?: boolean;
  createdAt?: Date;
}

export function isBrandAdminRole(role: UserRole | undefined): boolean {
  return role === 'owner' || role === 'admin';
}

export function isSuperAdminRole(role: UserRole | undefined): boolean {
  return role === 'super_admin';
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
  tiendanubeId?: number;
  tiendanubeVariantId?: number;
  hidden?: boolean;
}

export interface SaleItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  isExtra?: boolean;
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

export type StockLevel = 'high' | 'low' | 'empty';
