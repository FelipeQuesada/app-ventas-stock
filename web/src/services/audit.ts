import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AuditAction =
  | 'sale_create'
  | 'sale_update'
  | 'sale_delete'
  | 'stock_update'
  | 'caja_save'
  | 'caja_delete'
  | 'user_create'
  | 'user_update';

export type AuditEntityType = 'sale' | 'product' | 'caja' | 'user';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  userId: string;
  userName: string;
  createdAt: Date;
  meta?: Record<string, unknown>;
}

export interface AuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  userId: string;
  userName?: string;
  meta?: Record<string, unknown>;
}

const COLLECTION = 'auditLogs';

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await addDoc(collection(db, COLLECTION), {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      userId: input.userId,
      userName: input.userName ?? '',
      meta: input.meta ?? null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Audit log failed:', error);
  }
}

export async function getRecentAuditLogs(max = 50): Promise<AuditLog[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      action: data.action as AuditAction,
      entityType: data.entityType as AuditEntityType,
      entityId: data.entityId as string,
      summary: data.summary as string,
      userId: data.userId as string,
      userName: (data.userName as string) || '',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      meta: data.meta as Record<string, unknown> | undefined,
    };
  });
}
