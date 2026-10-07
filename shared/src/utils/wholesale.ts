import {
  WHOLESALE_OFFERS,
  type WholesaleOffer,
} from '../constants/wholesale';
import type { Product, SaleItem } from '../types/index';

export function normalizeWholesaleName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactWholesaleName(value: string): string {
  return normalizeWholesaleName(value).replace(/\s+/g, '').replace(/\./g, ',');
}

function offerMatchesName(offer: WholesaleOffer, name: string, colorIncludes?: string): boolean {
  const normalized = compactWholesaleName(name);
  if (!offer.nameIncludes.every((part) => normalized.includes(compactWholesaleName(part)))) {
    return false;
  }
  if (offer.nameExcludes?.some((part) => normalized.includes(compactWholesaleName(part)))) {
    return false;
  }
  if (colorIncludes && !normalized.includes(compactWholesaleName(colorIncludes))) {
    return false;
  }
  return true;
}

export function matchWholesaleOffer(product: Pick<Product, 'name'>): WholesaleOffer | null {
  return WHOLESALE_OFFERS.find((offer) => offerMatchesName(offer, product.name)) ?? null;
}

/** Si hay fichas duplicadas, usa la de mayor stock. */
export function resolveWholesaleProduct(
  products: Product[],
  offer: WholesaleOffer,
  colorIncludes?: string
): Product | null {
  const matches = products.filter(
    (product) => !product.hidden && offerMatchesName(offer, product.name, colorIncludes)
  );
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))[0];
}

export function wholesaleTierSummary(offer: WholesaleOffer): string {
  return [...offer.tiers]
    .sort((a, b) => a.minPacks - b.minPacks)
    .map((tier) => `${tier.minPacks}+ −${tier.percent}%`)
    .join(' · ');
}

export function wholesaleTierPercent(offer: WholesaleOffer, packCount: number): number {
  if (packCount < 1) return 0;
  const tier = [...offer.tiers]
    .sort((a, b) => b.minPacks - a.minPacks)
    .find((item) => packCount >= item.minPacks);
  return tier?.percent ?? 0;
}

export function wholesalePackCount(items: SaleItem[], offerId: string): number {
  const offer = WHOLESALE_OFFERS.find((item) => item.id === offerId);
  if (!offer) return 0;
  const units = items
    .filter((item) => item.wholesaleOfferId === offerId && item.wholesaleMode === 'pack')
    .reduce((sum, item) => sum + item.quantity, 0);
  return units / offer.unitsPerPack;
}

export function discountedUnitPrice(listUnitPrice: number, percent: number): number {
  return Math.round(listUnitPrice * (1 - percent / 100));
}

export function buildWholesalePackLine(
  product: Product,
  offer: WholesaleOffer,
  stockUnits: number
): SaleItem {
  const packs = stockUnits / offer.unitsPerPack;
  return {
    lineId: `pack-${offer.id}-${product.id}`,
    productId: product.id,
    productName: product.name,
    category: product.category,
    quantity: stockUnits,
    unitsPerPack: offer.unitsPerPack,
    packQuantity: Number.isInteger(packs) ? packs : undefined,
    listUnitPrice: offer.listUnitPrice,
    unitPrice: offer.listUnitPrice,
    subtotal: offer.listUnitPrice * stockUnits,
    wholesaleOfferId: offer.id,
    wholesaleMode: 'pack',
    lineDiscountPercent: 0,
  };
}

export function repriceCartLines(items: SaleItem[]): SaleItem[] {
  const packUnits = new Map<string, number>();
  for (const item of items) {
    if (!item.wholesaleOfferId || item.wholesaleMode !== 'pack') continue;
    packUnits.set(
      item.wholesaleOfferId,
      (packUnits.get(item.wholesaleOfferId) ?? 0) + item.quantity
    );
  }

  return items.map((item) => {
    if (item.wholesaleOfferId) {
      const offer = WHOLESALE_OFFERS.find((entry) => entry.id === item.wholesaleOfferId);
      if (!offer) return item;
      const packs = (packUnits.get(offer.id) ?? 0) / offer.unitsPerPack;
      const percent = wholesaleTierPercent(offer, packs);
      const list = item.listUnitPrice ?? offer.listUnitPrice;
      const unitPrice = discountedUnitPrice(list, percent);
      const exactPacks = item.quantity / offer.unitsPerPack;
      return {
        ...item,
        listUnitPrice: list,
        unitsPerPack: offer.unitsPerPack,
        lineDiscountPercent: percent,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        packQuantity:
          item.wholesaleMode === 'pack' && Number.isInteger(exactPacks) ? exactPacks : undefined,
      };
    }

    const percent = item.lineDiscountPercent ?? 0;
    if (percent > 0 && item.listUnitPrice != null && !item.isExtra) {
      const unitPrice = discountedUnitPrice(item.listUnitPrice, percent);
      return { ...item, unitPrice, subtotal: unitPrice * item.quantity };
    }
    return item;
  });
}

export function mergeWholesaleLines(current: SaleItem[], incoming: SaleItem[]): SaleItem[] {
  const next = [...current];
  for (const line of incoming) {
    const index = next.findIndex(
      (item) =>
        item.wholesaleMode === 'pack' &&
        item.wholesaleOfferId === line.wholesaleOfferId &&
        item.productId === line.productId
    );
    if (index >= 0) {
      next[index] = {
        ...next[index],
        quantity: next[index].quantity + line.quantity,
      };
    } else {
      next.push(line);
    }
  }
  return repriceCartLines(next);
}

export function lineKey(item: SaleItem): string {
  return item.lineId ?? item.productId;
}
