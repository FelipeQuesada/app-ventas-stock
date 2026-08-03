import { describe, expect, it } from 'vitest';
import { parsePrice } from '../price';
import {
  calculateDiscount,
  calculateSaleTotal,
  calculateChange,
} from '../discount';
import {
  calculateCajaGanancia,
  calculateCambioCierre,
  canSaveToCentral,
  canWithdraw,
} from '../caja';

describe('parsePrice', () => {
  it('parsea números y formatos AR/US', () => {
    expect(parsePrice(1500)).toBe(1500);
    expect(parsePrice('4,000.50')).toBe(4000.5);
    expect(parsePrice('4.000,50')).toBe(4000.5);
    expect(parsePrice('45000,50')).toBe(45000.5);
    expect(parsePrice('$ 1.200')).toBe(1200);
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });
});

describe('descuentos', () => {
  it('calcula porcentaje y monto fijo', () => {
    expect(calculateDiscount(1000, 'percent', 10)).toBe(100);
    expect(calculateDiscount(1000, 'fixed', 250)).toBe(250);
    expect(calculateDiscount(100, 'fixed', 250)).toBe(100);
    expect(calculateDiscount(1000, null, 10)).toBe(0);
    expect(calculateDiscount(1000, 'percent', 0)).toBe(0);
  });

  it('calcula total y vuelto', () => {
    expect(calculateSaleTotal(1000, 100)).toBe(900);
    expect(calculateChange(1000, 900)).toBe(100);
    expect(calculateChange(800, 900)).toBe(0);
  });
});

describe('caja', () => {
  it('calcula ganancia y cambio de cierre', () => {
    expect(calculateCajaGanancia(50000, 10000)).toBe(40000);
    expect(calculateCambioCierre(50000, 30000)).toBe(20000);
  });

  it('valida guardado y retiro', () => {
    expect(canSaveToCentral(1000, 5000)).toBe(true);
    expect(canSaveToCentral(6000, 5000)).toBe(false);
    expect(canWithdraw(1000, 2000)).toBe(true);
    expect(canWithdraw(0, 2000)).toBe(false);
  });
});
