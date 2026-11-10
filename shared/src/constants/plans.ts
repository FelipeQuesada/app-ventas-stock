/** Planes Control+ — límites y features */

export type PlanId = 'trial' | 'starter' | 'pro' | 'enterprise';

export interface PlanLimits {
  maxUsers: number;
  statistics: boolean;
  tiendanube: boolean;
  flex: boolean;
  presupuestos: boolean;
  multiPayment: boolean;
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
      maxUsers: 2,
      statistics: true,
      tiendanube: false,
      flex: false,
      presupuestos: true,
      multiPayment: true,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Ideal para un local',
    limits: {
      maxUsers: 3,
      statistics: true,
      tiendanube: false,
      flex: false,
      presupuestos: true,
      multiPayment: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Stock, caja y equipo completo',
    limits: {
      maxUsers: 10,
      statistics: true,
      tiendanube: true,
      flex: true,
      presupuestos: true,
      multiPayment: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Sin límites prácticos',
    limits: {
      maxUsers: 100,
      statistics: true,
      tiendanube: true,
      flex: true,
      presupuestos: true,
      multiPayment: true,
    },
  },
};

export function getPlanLimits(planId: PlanId | string | undefined): PlanLimits {
  const id = (planId as PlanId) in PLAN_DEFINITIONS ? (planId as PlanId) : 'starter';
  return PLAN_DEFINITIONS[id].limits;
}
