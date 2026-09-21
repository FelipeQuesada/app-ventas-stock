import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  parseFlexLabelDate,
  parseMercadoLibreFlexLabels,
  resolveFlexLocality,
  splitMercadoLibreLabelTexts,
} from '../../../shared/src/utils/flexLabels';

const SAMPLE = `Venta ID: 2000018568598460 Recortá esta parte de la etiqueta para
que tu paquete viaje seguro.
1Unidad
Color: Cristal
SKU: resina epoxi 150g
Resina Epoxi Cristal Para Cuadros Vidrio
Liquido X 150 Gr Cristal
KELCOT SOCIEDAD ANONIMA K #204426856
Avenida Corrientes 3169 , Balvanera
Balvanera CP 1193
Envio: 4806579 7050
Venta: 20000 18568598460
FLEX 21 SEPT
CP: 1882
QUILMES
QUILMES
RESIDENCIAL
Direccion: Calle Rep de Francia 832
Barrio: Quilmes
Referencia: Entre: Minuto y ing.Carpintero
Destinatario: Marcela Iris Chamorro
(MARCELAIRISCHAMORRO)`;

const MULTI = `Pack ID: 2000015136567701 Recortá esta parte
FLEX 21 SEPT
CP: 1888
FLORENCIO VARELA
FLORENCIO VARELA
RESIDENCIAL
Destinatario: A
Venta ID: 2000018568702172 Recortá esta parte
FLEX 21 SEPT
CP: 1648
TIGRE
TIGRE
RESIDENCIAL
Destinatario: B
Venta ID: 2000018568641892 Recortá esta parte
FLEX 21 SEPT
CP: 1407
CABA
PARQUE AVELLANEDA
RESIDENCIAL
Destinatario: C`;

describe('flexLabels', () => {
  it('resuelve Quilmes a zona 2', () => {
    expect(resolveFlexLocality('QUILMES')).toEqual({ locality: 'Quilmes', zone: 'zona2' });
  });

  it('resuelve CABA y Vicente López con acento', () => {
    expect(resolveFlexLocality('CABA')).toEqual({ locality: 'CABA', zone: 'caba' });
    expect(resolveFlexLocality('VICENTE LÓPEZ')).toEqual({
      locality: 'Vicente Lopez',
      zone: 'zona1',
    });
    expect(resolveFlexLocality('LA PLATA NORTE')).toEqual({
      locality: 'La Plata Norte',
      zone: 'zona3',
    });
  });

  it('parsea fecha FLEX', () => {
    const date = parseFlexLabelDate(SAMPLE, 2026);
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(8);
    expect(date?.getDate()).toBe(21);
  });

  it('parsea etiqueta ML de ejemplo', () => {
    const result = parseMercadoLibreFlexLabels([SAMPLE], { referenceYear: 2026 });
    expect(result.totalPages).toBe(1);
    expect(result.totalLabels).toBe(1);
    expect(result.unmatched).toHaveLength(0);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toMatchObject({
      locality: 'Quilmes',
      zone: 'zona2',
      quantity: 1,
      dateId: '2026-09-21',
    });
  });

  it('agrupa varias etiquetas del mismo día/lugar', () => {
    const result = parseMercadoLibreFlexLabels([SAMPLE, SAMPLE], { referenceYear: 2026 });
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].quantity).toBe(2);
  });

  it('parsea texto aplanado sin saltos de línea', () => {
    const flat = SAMPLE.replace(/\n/g, ' ');
    const result = parseMercadoLibreFlexLabels([flat], { referenceYear: 2026 });
    expect(result.matched[0]).toMatchObject({
      locality: 'Quilmes',
      zone: 'zona2',
      dateId: '2026-09-21',
    });
  });

  it('separa varias etiquetas en la misma página', () => {
    expect(splitMercadoLibreLabelTexts([MULTI])).toHaveLength(3);
    const result = parseMercadoLibreFlexLabels([MULTI], { referenceYear: 2026 });
    expect(result.totalLabels).toBe(3);
    expect(result.unmatched).toHaveLength(0);
    expect(result.matched.reduce((s, r) => s + r.quantity, 0)).toBe(3);
    const byLoc = Object.fromEntries(result.matched.map((r) => [r.locality, r.quantity]));
    expect(byLoc['Florencio Varela']).toBe(1);
    expect(byLoc.Tigre).toBe(1);
    expect(byLoc.CABA).toBe(1);
  });

  it('reconoce las 26 etiquetas del PDF real de prueba', () => {
    const fixturePath = resolve(__dirname, 'fixtures/ml-labels-26.json');
    const pages = JSON.parse(readFileSync(fixturePath, 'utf-8')) as string[];
    const result = parseMercadoLibreFlexLabels(pages, { referenceYear: 2026 });
    expect(result.totalPages).toBe(9);
    expect(result.totalLabels).toBe(26);
    expect(result.unmatched).toHaveLength(0);
    expect(result.matched.reduce((s, r) => s + r.quantity, 0)).toBe(26);
  });
});
