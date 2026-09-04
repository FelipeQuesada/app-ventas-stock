import { describe, expect, it } from 'vitest';
import { computeResinAccounting } from '@advance-coat/shared';
import type { Sale } from '@advance-coat/shared';

function makeSale(items: Sale['items'], total?: number): Sale {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  return {
    id: '1',
    date: new Date(),
    items,
    paymentMethod: 'efectivo',
    customer: { name: '', email: '', phone: '' },
    subtotal,
    total: total ?? subtotal,
    customerCount: 1,
    createdBy: 'u',
    createdAt: new Date(),
  };
}

describe('computeResinAccounting', () => {
  it('cuenta resina 150g directa', () => {
    const sale = makeSale([
      {
        productId: 'p1',
        productName: 'Resina Epoxi Cristal 150g - Ideal Para Empezar Tu Proyecto',
        category: 'Revestimientos',
        quantity: 2,
        unitPrice: 12000,
        subtotal: 24000,
      },
    ]);
    const result = computeResinAccounting([sale]);
    expect(result.units['150g']).toBe(2);
    expect(result.resinMoney).toBe(24000);
    expect(result.extrasMoney).toBe(0);
  });

  it('reparte combo letras grandes proporcionalmente con descuento', () => {
    const sale = makeSale(
      [
        {
          productId: 'c1',
          productName: 'Combo Letras Grandes Básico - Empezá A Hacer Llaveros',
          category: 'Combos',
          quantity: 1,
          unitPrice: 50000,
          subtotal: 50000,
        },
      ],
      40000
    );
    const result = computeResinAccounting([sale], {
      catalogPrices: new Map([
        ['combo letras grandes basico - empeza a hacer llaveros', 52000],
      ]),
    });
    expect(result.units['300g']).toBe(1);
    expect(result.units.dr).toBe(5);
    const factor = 40000 / 50000;
    expect(result.resinMoney).toBeCloseTo(50000 * (22000 / 52000) * factor, 0);
    expect(result.extrasMoney).toBeCloseTo(50000 * (30000 / 52000) * factor, 0);
  });

  it('combo pigmentos suma 8 DR', () => {
    const sale = makeSale([
      {
        productId: 'c2',
        productName: 'Combo Pigmentos Traslúcidos',
        category: 'Combos',
        quantity: 1,
        unitPrice: 30000,
        subtotal: 30000,
      },
    ]);
    const result = computeResinAccounting([sale]);
    expect(result.units.dr).toBe(8);
    expect(result.extrasMoney).toBe(30000);
    expect(result.resinMoney).toBe(0);
  });
});
