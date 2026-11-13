/** Planes Control+ — límites y features */

export type PlanId = 'trial' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxUsers: number;
  statistics: boolean;
  tiendanube: boolean;
  flex: boolean;
  presupuestos: boolean;
  multiPayment: boolean;
  /** Avisos a un grupo de Telegram (cierres / ventas) */
  telegram: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  limits: PlanLimits;
}

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Prueba',
    description: '14 días para probar el sistema',
    limits: {
      maxUsers: 5,
      statistics: true,
      tiendanube: false,
      flex: false,
      presupuestos: true,
      multiPayment: true,
      telegram: true,
    },
  },
  starter: {
    id: 'starter',
    name: 'Inicio',
    description: 'Operá tu local gratis',
    limits: {
      maxUsers: 1,
      statistics: false,
      tiendanube: false,
      flex: false,
      presupuestos: false,
      // Gratis: solo Transferencia (sin dual ni catálogo amplio)
      multiPayment: false,
      telegram: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Equipo, control y reportes',
    limits: {
      maxUsers: 5,
      statistics: true,
      tiendanube: false,
      flex: false,
      presupuestos: true,
      multiPayment: true,
      telegram: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresa',
    description: 'Más usuarios, Flex y soporte',
    limits: {
      maxUsers: 25,
      statistics: true,
      tiendanube: false,
      flex: true,
      presupuestos: true,
      multiPayment: true,
      telegram: true,
    },
  },
};

export function getPlanLimits(planId: PlanId | string | undefined): PlanLimits {
  const id = (planId as PlanId) in PLAN_DEFINITIONS ? (planId as PlanId) : 'starter';
  return PLAN_DEFINITIONS[id].limits;
}
