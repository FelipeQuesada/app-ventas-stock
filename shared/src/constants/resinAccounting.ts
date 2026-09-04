/** Precios de referencia para reparto proporcional (ARS). */
export const RESIN_REF_150G = 12_000;
export const RESIN_REF_300G = 22_000;
export const RESIN_REF_750G = 45_000;
export const DR_REF_PRICE = 6_000;
export const BEL_REF_PRICE = 7_000;

export type ResinUnitKey = '150g' | '300g' | '750g' | '1.5kg' | '3kg' | 'catalizador' | 'dr' | 'bel';

export const RESIN_UNIT_LABELS: Record<ResinUnitKey, string> = {
  '150g': '150g',
  '300g': '300g',
  '750g': '750g',
  '1.5kg': '1,5kg',
  '3kg': '3kg',
  catalizador: 'Catalizador',
  dr: 'DR',
  bel: 'BEL',
};

export const RESIN_PRODUCTS_150G = [
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 150g',
  'Resina Epoxi Cristal 150g - Ideal Para Empezar Tu Proyecto',
];

export const RESIN_PRODUCTS_300G = [
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 300g',
  'Resina Epoxi Cristal 300g - Llaveros, Dijes y Aros',
  'Resina Epoxi para Fundas - Acabado Cristal Sin Burbujas',
];

export const RESIN_PRODUCTS_450G = [
  'Resina Epoxi Cristal 450g - Llaveros, Dijes y Aros',
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 450g',
];

export const RESIN_PRODUCTS_750G = [
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 750g',
  'Resina Epoxi Cristal 750g - Ideal Para Vender y Emprender',
];

export const RESIN_PRODUCTS_1KG = [
  'Resina Epoxi Cristal 1kg - Para Producción Continua',
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 1kg',
];

export const RESIN_PRODUCTS_1_5KG = [
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 1,5kg',
  'Resina Epoxi Cristal 1,5kg - Stock para Producción Continua',
];

export const RESIN_PRODUCTS_3KG = [
  'Resina Epoxi Cristal - Para Llaveros, Dijes y Aros - 3kg',
  'Resina Epoxi Cristal 3kg - Presentación Mayorista',
];

export const RESIN_PRODUCTS_6KG = [
  'Resina Epoxi Cristal 6kg - Mayorista para Producción Industrial',
];

export const CATALYST_PRODUCTS = [
  'Repuesto Catalizador Componente B - 100g Componente B',
  'Repuesto Catalizador Componente B - 1kg Componente B',
  'Repuesto Catalizador Componente B - 250g Componente B',
  'Repuesto Catalizador Componente B - 500g Componente B',
  'Repuesto Catalizador Componente B - 50g Componente B',
];

export const COMBOS_150G = [
  'Combo Llaveros con Letras - Kit Inicial para Empezar',
  'Kit Resina Epoxi 150 Gramos + Vaso Medidor Molde Silicona',
  'Combo Dijes y Colgantes - Crea Joyería Artesanal Única',
  'Combo Lapiceras Personalizadas - Regalos y Souvenirs Únicos',
  'Kit de Medición Profesional - Mezclas Exactas Sin Errores',
  'Combo para Hacer Fundas Charms - Resina Epoxi',
  'Combo Llaveros con Letras - Crea Nombres Personalizados',
  'Combo Formas Navideñas - Pack Completo Edición Navidad',
];

export const COMBOS_300G_SIMPLE = [
  'Combo Llaveros Inicial - Tu Primer Proyecto en Resina',
  'Combo Ideal Llaveros - El Más Vendido Para Principiantes',
  'Combo Glitters y Escamas - Brillo Profesional Para Resina',
  'Combo MEGA Llaveros - Stock Para Emprender en Grande',
  'Combo Inicial Completo - Todo Para Hacer 30 Llaveros y Vender - CON BALANZA',
  'Combo Inicial Completo - Todo Para Hacer 30 Llaveros y Vender - SIN BALANZA',
  'Combo Completo para hacer Letras con Resina Epoxi',
  'Combo Emprendedora | Resina + Moldes + Llaveros Para Souvenirs',
];

export const COMBO_LETRAS_GRANDES =
  'Combo Letras Grandes Básico - Empezá A Hacer Llaveros';

export const COMBO_OLAS_MARES = 'Combo Olas y Mares - Cuadros Tipo Océano en Resina';

export const COMBO_PIGMENTOS_TRANSLUCIDOS = 'Combo Pigmentos Traslúcidos';

export const PACK_6_CONCENTRADOS = 'Pack 6 Concentrados Plenos Para Resina - Pigmentos';

/** Patrones en nombre de producto (normalizado). */
export const DR_NAME_PATTERN = 'concentrado color resina translucido 30cc';
export const BEL_NAME_PATTERN = 'pigmento pleno premium para resina';
