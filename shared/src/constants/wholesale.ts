export interface WholesaleTier {
  minPacks: number;
  percent: number;
}

export interface WholesaleColor {
  id: string;
  label: string;
  /** Fragmento del nombre en la app, sin tildes */
  nameIncludes: string;
}

export interface WholesaleOffer {
  id: string;
  label: string;
  /** caja o pack, como se vende */
  unitLabel: 'caja' | 'pack';
  unitsPerPack: number;
  /** Precio de venta al público por unidad */
  listUnitPrice: number;
  tiers: WholesaleTier[];
  /** Todos estos textos tienen que estar en el nombre */
  nameIncludes: string[];
  /** Si el nombre incluye alguno, no es esta ficha */
  nameExcludes?: string[];
  colors?: WholesaleColor[];
}

const RESIN_TIERS: WholesaleTier[] = [
  { minPacks: 1, percent: 25 },
  { minPacks: 3, percent: 30 },
  { minPacks: 10, percent: 35 },
];

/** Escamas y glitter con formas: el descuento arranca más alto y cierra en 3 packs. */
const PACK_30_TIERS: WholesaleTier[] = [
  { minPacks: 1, percent: 30 },
  { minPacks: 2, percent: 35 },
  { minPacks: 3, percent: 40 },
];

/** Flores prensadas. */
const PRESSED_FLOWER_TIERS: WholesaleTier[] = [
  { minPacks: 1, percent: 25 },
  { minPacks: 2, percent: 35 },
  { minPacks: 10, percent: 40 },
];

const resinExcludes = ['combo', 'kit', 'fundas'];

export const WHOLESALE_OFFERS: WholesaleOffer[] = [
  {
    id: 'resina-150',
    label: 'Resina cristal 150 g',
    unitLabel: 'caja',
    unitsPerPack: 36,
    listUnitPrice: 12_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['resina epoxi cristal', '150g'],
    nameExcludes: resinExcludes,
  },
  {
    id: 'resina-300',
    label: 'Resina cristal 300 g',
    unitLabel: 'caja',
    unitsPerPack: 24,
    listUnitPrice: 22_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['resina epoxi cristal', '300g'],
    nameExcludes: resinExcludes,
  },
  {
    id: 'resina-750',
    label: 'Resina cristal 750 g',
    unitLabel: 'caja',
    unitsPerPack: 6,
    listUnitPrice: 45_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['resina epoxi cristal', '750g'],
    nameExcludes: resinExcludes,
  },
  {
    id: 'resina-1500',
    label: 'Resina cristal 1,5 kg',
    unitLabel: 'caja',
    unitsPerPack: 4,
    listUnitPrice: 85_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['resina epoxi cristal', '1,5kg'],
    nameExcludes: resinExcludes,
  },
  {
    id: 'resina-3000',
    label: 'Resina cristal 3 kg',
    unitLabel: 'caja',
    unitsPerPack: 2,
    listUnitPrice: 165_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['resina epoxi cristal', '3kg'],
    nameExcludes: [...resinExcludes, '1,5kg', '6kg'],
  },
  {
    id: 'resina-volumen-1',
    label: 'Resina volumen 1 kg 1:1',
    unitLabel: 'caja',
    unitsPerPack: 6,
    listUnitPrice: 55_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['volumen', '1kg'],
    nameExcludes: resinExcludes,
  },
  {
    id: 'resina-uv-100',
    label: 'Resina UV 100 g',
    unitLabel: 'caja',
    unitsPerPack: 20,
    listUnitPrice: 18_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['resina uv'],
    nameExcludes: resinExcludes,
  },
  {
    id: 'concentrado-translucido',
    label: 'Concentrado translúcido 30 cc',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 6_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['concentrado color resina translucido 30cc'],
    colors: [
      { id: 'negro', label: 'Negro', nameIncludes: 'negro' },
      { id: 'azul', label: 'Azul', nameIncludes: 'azul' },
      { id: 'rojo', label: 'Rojo', nameIncludes: 'rojo' },
      { id: 'amarillo', label: 'Amarillo', nameIncludes: 'amarillo' },
      { id: 'verde', label: 'Verde', nameIncludes: 'verde' },
      { id: 'naranja', label: 'Naranja', nameIncludes: 'naranja' },
      { id: 'fucsia', label: 'Fucsia', nameIncludes: 'fucsia' },
      { id: 'blanco', label: 'Blanco', nameIncludes: 'blanco' },
    ],
  },
  {
    id: 'pigmento-pleno',
    label: 'Pigmento pleno',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 7_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['pigmento pleno premium para resina'],
    colors: [
      { id: 'negro', label: 'Negro', nameIncludes: 'negro' },
      { id: 'blanco', label: 'Blanco', nameIncludes: 'blanco' },
      { id: 'azul', label: 'Azul', nameIncludes: 'azul' },
      { id: 'rojo', label: 'Rojo', nameIncludes: 'rojo' },
      { id: 'amarillo', label: 'Amarillo', nameIncludes: 'amarillo' },
      { id: 'verde', label: 'Verde', nameIncludes: 'verde' },
    ],
  },
  {
    id: 'pigmento-metalizado',
    label: 'Pigmento metalizado',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 3_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['pigmentos metalizados', 'efecto profesional para resina'],
    colors: [
      { id: 'perlado', label: 'Perlado', nameIncludes: 'blanco' },
      { id: 'bronce', label: 'Bronce', nameIncludes: 'bronce' },
      { id: 'dorado', label: 'Dorado', nameIncludes: 'dorado' },
    ],
  },
  {
    id: 'molde-letras-grandes',
    label: 'Letras grandes',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 13_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['molde silicona letras grandes'],
  },
  {
    id: 'molde-mini-dijes',
    label: 'Molde mini dijes',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 6_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['mini dijes'],
  },
  {
    id: 'molde-lapicera',
    label: 'Lapicera rectangular',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 6_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['lapicera rectangular'],
  },
  {
    id: 'molde-apoya-vasos',
    label: 'Apoya vasos circular',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 6_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['apoya vasos'],
  },
  {
    id: 'molde-senaladores',
    label: 'Pack 3 señaladores',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 8_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['señalador'],
  },
  {
    id: 'molde-compartir',
    label: 'Molde para compartir',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 6_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['para compartir'],
  },
  {
    id: 'molde-porta-sube',
    label: 'Molde porta SUBE',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 5_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['porta sube'],
  },
  {
    id: 'molde-plancha-dijes',
    label: 'Plancha de dijes',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 6_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['plancha de dijes'],
  },
  {
    id: 'molde-tapa-agenda',
    label: 'Molde tapa de agenda',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 7_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['tapa agenda'],
  },
  {
    id: 'molde-ositos',
    label: 'Molde plancha ositos',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 6_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['7 ositos'],
  },
  {
    id: 'molde-corazones',
    label: 'Molde corazones',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 7_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['coronas corazones'],
  },
  {
    id: 'vaso-medidor',
    label: 'Vasos medidores',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 5_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['vaso medidor silicona'],
    nameExcludes: ['kit', 'combo'],
  },
  {
    id: 'balanza',
    label: 'Balanza digital',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 9_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['balanza digital'],
    nameExcludes: ['combo'],
  },
  {
    id: 'soplete',
    label: 'Soplete',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 7_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['soplete'],
  },
  {
    id: 'rebarbador',
    label: 'Rebarbador',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 8_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['rebarbador'],
  },
  {
    id: 'pistola-calor',
    label: 'Pistola de calor',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 21_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['pistola de calor'],
  },
  {
    id: 'combo-pinzas',
    label: 'Combo 3 pinzas',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 12_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['combo 3 pinzas'],
  },
  {
    id: 'pinza-precision',
    label: 'Pinza de precisión',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 6_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['pinza de precisión'],
  },
  {
    id: 'llaveros-argollas',
    label: 'Llaveros',
    unitLabel: 'pack',
    unitsPerPack: 20,
    listUnitPrice: 3_500,
    tiers: RESIN_TIERS,
    nameIncludes: ['llaveros para resina epoxi'],
  },
  {
    id: 'perforadora',
    label: 'Perforadora eléctrica',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 20_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['perforadora'],
  },
  {
    id: 'lampara-uv',
    label: 'Lámpara UV',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 12_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['lampara uv'],
  },
  {
    id: 'escamas',
    label: 'Escamas',
    unitLabel: 'pack',
    unitsPerPack: 25,
    listUnitPrice: 3_000,
    tiers: PACK_30_TIERS,
    nameIncludes: ['glitter en escamas'],
    colors: [
      { id: 'turquesa', label: 'Turquesa', nameIncludes: 'turquesa' },
      { id: 'blanco', label: 'Blanco', nameIncludes: 'blanco' },
      { id: 'azul', label: 'Azul', nameIncludes: 'azul' },
      { id: 'violeta', label: 'Violeta', nameIncludes: 'violeta' },
      { id: 'verde', label: 'Verde', nameIncludes: 'verde' },
      { id: 'naranja', label: 'Naranja', nameIncludes: 'naranja' },
      { id: 'rosa', label: 'Rosa', nameIncludes: 'rosa' },
    ],
  },
  {
    id: 'glitter-formas',
    label: 'Glitter con formas',
    unitLabel: 'pack',
    unitsPerPack: 25,
    listUnitPrice: 3_250,
    tiers: PACK_30_TIERS,
    nameIncludes: ['glitters pasteles con formas'],
    colors: [
      { id: 'letras', label: 'Letras', nameIncludes: 'letras' },
      { id: 'corazones', label: 'Corazones', nameIncludes: 'corazones' },
      { id: 'estrellas', label: 'Estrellas', nameIncludes: 'estrellas' },
    ],
  },
  {
    id: 'flores-secas',
    label: 'Flores secas',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 8_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['kit flores secas'],
    nameExcludes: ['prensadas'],
  },
  {
    id: 'flores-prensadas',
    label: 'Flores secas prensadas',
    unitLabel: 'pack',
    unitsPerPack: 12,
    listUnitPrice: 7_500,
    tiers: PRESSED_FLOWER_TIERS,
    nameIncludes: ['flores secas prensadas'],
  },
  {
    id: 'caja-24-glitters',
    label: 'Caja 24 glitters',
    unitLabel: 'pack',
    unitsPerPack: 10,
    listUnitPrice: 15_000,
    tiers: RESIN_TIERS,
    nameIncludes: ['caja 24 glitters'],
  },
];

export const MAYORISTA_CATEGORY = '__mayorista__';
