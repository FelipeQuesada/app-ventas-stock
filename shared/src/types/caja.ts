export interface DailyCaja {
  id: string;
  date: Date;
  cajaCambio: number;
  cajaTotal: number;
  ganancia: number;
  /** Monto transferido a caja central ese día (no baja por retiros) */
  totalGuardado: number;
  /** @deprecated Usar totalGuardado */
  guardo?: number;
  cambioCierre: number;
  /** Día sin ventas en efectivo ni guardados/retiros; el cambio se arrastra igual */
  sinMovimiento?: boolean;
  /** Quién cerró la caja (lista de vendedores) */
  closedByName?: string;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: Date;
}

export type CajaCentralMovementType = 'deposito' | 'retiro';

export interface CajaCentral {
  id: string;
  balance: number;
  updatedAt: Date;
  updatedBy?: string;
  updatedByName?: string;
}

export interface CajaCentralMovement {
  id: string;
  type: CajaCentralMovementType;
  amount: number;
  date: Date;
  actorName: string;
  userId: string;
  userName?: string;
  cajaDateId?: string;
  createdAt: Date;
  note?: string;
}
