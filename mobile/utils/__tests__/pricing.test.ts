import { describe, expect, it } from 'vitest';
import { parsePrice } from '../price';
import {
  calculateDiscount,
  calculateSaleTotal,
  calculateChange,
} from '../discount';
import {
  calculateCajaTotal,
  buildSinMovimientoCaja,
  buildCajaCierreMessage,
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
  it('suma ventas efectivo + cambio en caja total', () => {
    expect(calculateCajaTotal(50400, 17670)).toBe(68070);
  });

  it('arma cierre sin movimiento arrastrando el cambio', () => {
    expect(buildSinMovimientoCaja(17670)).toEqual({
      cajaCambio: 17670,
      cajaTotal: 17670,
      totalGuardado: 0,
      ganancia: 0,
      cambioCierre: 17670,
      sinMovimiento: true,
    });
  });

  it('arma el mensaje de cierre de caja', () => {
    const text = buildCajaCierreMessage({
      date: new Date(2026, 7, 15),
      cajaCambio: 17670,
      cajaTotal: 68070,
      ganancia: 50400,
      totalGuardado: 40000,
      cambioCierre: 28070,
    });
    expect(text).toContain('Cambio caja:');
    expect(text).toContain('Caja total:');
    expect(text).toContain('Ganancia:');
    expect(text).toContain('Guardo:');
    expect(text).toContain('Dejo en caja:');
  });

  it('calcula ganancia y cambio de cierre', () => {
    // ganancia = (ventas + cambio) − cambio = ventas del día
    expect(calculateCajaGanancia(calculateCajaTotal(50400, 17670), 17670)).toBe(50400);
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
