import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateSaleInput, createSale } from '@/services/sales';

const QUEUE_KEY = '@pending_sales_queue';

export type PendingSale = {
  id: string;
  createdAt: string;
  input: CreateSaleInput;
  /** Dates serialized as ISO strings for AsyncStorage */
  inputSerialized: Omit<CreateSaleInput, 'date'> & { date: string };
};

function serializeInput(input: CreateSaleInput): PendingSale['inputSerialized'] {
  return {
    ...input,
    date: input.date.toISOString(),
  };
}

function deserializeInput(data: PendingSale['inputSerialized']): CreateSaleInput {
  return {
    ...data,
    date: new Date(data.date),
  };
}

export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingSale['inputSerialized'][];
    return parsed.map((item, index) => ({
      id: `pending-${item.date}-${index}`,
      createdAt: item.date,
      inputSerialized: item,
      input: deserializeInput(item),
    }));
  } catch {
    return [];
  }
}

async function saveQueue(items: PendingSale['inputSerialized'][]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueSale(input: CreateSaleInput): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const queue: PendingSale['inputSerialized'][] = raw ? JSON.parse(raw) : [];
  queue.push(serializeInput(input));
  await saveQueue(queue);
}

export async function getPendingSalesCount(): Promise<number> {
  const pending = await getPendingSales();
  return pending.length;
}

export async function syncPendingSales(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSales();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const remaining: PendingSale['inputSerialized'][] = [];
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await createSale(item.input, { skipOfflineQueue: true });
      synced += 1;
    } catch {
      remaining.push(item.inputSerialized);
      failed += 1;
    }
  }

  await saveQueue(remaining);
  return { synced, failed };
}

export function isLikelyNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = (error as { code?: string })?.code ?? '';
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('failed to fetch') ||
    message.includes('internet')
  );
}
