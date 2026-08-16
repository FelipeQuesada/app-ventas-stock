export interface DailyCaja {
  id: string;
  date: Date;
  cajaCambio: number;
  cajaTotal: number;
  ganancia: number;
  /** Total neto guardado en caja central (guardados − retiros) */
  totalGuardado: number;
  /** @deprecated Usar totalGuardado */
  guardo?: number;
  cambioCierre: number;
  /** Día sin ventas en efectivo ni guardados/retiros; el cambio se arrastra igual */
  sinMovimiento?: boolean;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: Date;
}
