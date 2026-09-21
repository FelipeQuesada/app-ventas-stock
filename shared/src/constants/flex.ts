/** Zonas Flex (envíos) y precios unitarios */

export const FLEX_ZONE_IDS = ['caba', 'zona1', 'zona2', 'zona3'] as const;

export type FlexZoneId = (typeof FLEX_ZONE_IDS)[number];

export const FLEX_ZONE_LABELS: Record<FlexZoneId, string> = {
  caba: 'CABA',
  zona1: 'Zona 1',
  zona2: 'Zona 2',
  zona3: 'Zona 3',
};

export const FLEX_ZONE_PRICES: Record<FlexZoneId, number> = {
  caba: 3450,
  zona1: 4700,
  zona2: 5400,
  zona3: 6100,
};

export const FLEX_LOCALITIES: Record<FlexZoneId, readonly string[]> = {
  caba: ['CABA'],
  zona1: [
    'Avellaneda',
    'Hurlingham',
    'Ituzaingo',
    'La Matanza Norte',
    'Lanus',
    'Lomas de Zamora',
    'Moron',
    'San Fernando',
    'San Isidro',
    'San Martin',
    'Tres de Febrero',
    'Vicente Lopez',
  ],
  zona2: [
    'Almirante Brown',
    'Berazategui',
    'Esteban Echeverria',
    'Ezeiza',
    'Florencio Varela',
    'Jose C Paz',
    'La Matanza Sur',
    'Malvinas Argentinas',
    'Merlo',
    'Moreno',
    'Nordelta',
    'Quilmes',
    'San Miguel',
    'Tigre',
  ],
  zona3: [
    'Berisso',
    'Campana',
    'Cañuelas',
    'Del Viso',
    'Derqui',
    'Ensenada',
    'Escobar',
    'Garin',
    'General Rodriguez',
    'Guernica',
    'Ingeniero Maschwitz',
    'La Plata Centro',
    'La Plata Norte',
    'La Plata Oeste',
    'Lujan',
    'Marcos Paz',
    'Pilar',
    'San Vicente',
    'Villa Rosa',
    'Zarate',
  ],
};

export function isFlexZoneId(value: string): value is FlexZoneId {
  return (FLEX_ZONE_IDS as readonly string[]).includes(value);
}

export function getLocalitiesForZone(zone: FlexZoneId): readonly string[] {
  return FLEX_LOCALITIES[zone];
}

/** Todas las localidades (orden alfabético) para elegir lugar primero. */
export const FLEX_ALL_LOCALITIES: readonly string[] = FLEX_ZONE_IDS.flatMap(
  (zone) => [...FLEX_LOCALITIES[zone]]
).sort((a, b) => a.localeCompare(b, 'es'));

export function findZoneForLocality(locality: string): FlexZoneId | null {
  const needle = locality.trim().toLowerCase();
  for (const zone of FLEX_ZONE_IDS) {
    if (FLEX_LOCALITIES[zone].some((loc) => loc.toLowerCase() === needle)) {
      return zone;
    }
  }
  return null;
}
