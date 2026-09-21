import {
  FLEX_ALL_LOCALITIES,
  FLEX_LOCALITIES,
  FLEX_ZONE_IDS,
  findZoneForLocality,
  type FlexZoneId,
} from '../constants/flex';
import { calcFlexLineTotal, dateToFlexId } from './flex';

const MONTHS: Record<string, number> = {
  ene: 0,
  enero: 0,
  feb: 1,
  febrero: 1,
  mar: 2,
  marzo: 2,
  abr: 3,
  abril: 3,
  may: 4,
  mayo: 4,
  jun: 5,
  junio: 5,
  jul: 6,
  julio: 6,
  ago: 7,
  agosto: 7,
  sep: 8,
  set: 8,
  sept: 8,
  septiembre: 8,
  setiembre: 8,
  oct: 9,
  octubre: 9,
  nov: 10,
  noviembre: 10,
  dic: 11,
  diciembre: 11,
};

/** Variantes frecuentes en etiquetas ML → localidad canónica Flex. */
const LOCALITY_ALIASES: Record<string, string> = {
  caba: 'CABA',
  'capital federal': 'CABA',
  'ciudad autonoma de buenos aires': 'CABA',
  'ciudad de buenos aires': 'CABA',
  'bs as': 'CABA',
  'bs. as.': 'CABA',
  ituzaingo: 'Ituzaingo',
  lanus: 'Lanus',
  moron: 'Moron',
  'san martin': 'San Martin',
  'vicente lopez': 'Vicente Lopez',
  'jose c paz': 'Jose C Paz',
  'jose c. paz': 'Jose C Paz',
  'j c paz': 'Jose C Paz',
  'jc paz': 'Jose C Paz',
  'esteban echeverria': 'Esteban Echeverria',
  'almirante brown': 'Almirante Brown',
  'florencio varela': 'Florencio Varela',
  'malvinas argentinas': 'Malvinas Argentinas',
  'general rodriguez': 'General Rodriguez',
  'ingeniero maschwitz': 'Ingeniero Maschwitz',
  'la plata': 'La Plata Centro',
  'la plata centro': 'La Plata Centro',
  'la plata norte': 'La Plata Norte',
  'la plata oeste': 'La Plata Oeste',
  'la matanza': 'La Matanza Norte',
  'la matanza norte': 'La Matanza Norte',
  'la matanza sur': 'La Matanza Sur',
  quilmes: 'Quilmes',
  tigre: 'Tigre',
  pilar: 'Pilar',
  merlo: 'Merlo',
  moreno: 'Moreno',
  ezeiza: 'Ezeiza',
  berazategui: 'Berazategui',
  escobar: 'Escobar',
  campana: 'Campana',
  zarate: 'Zarate',
  lujan: 'Lujan',
  canuelas: 'Cañuelas',
  'cañuelas': 'Cañuelas',
  nordelta: 'Nordelta',
  'san miguel': 'San Miguel',
  'san isidro': 'San Isidro',
  'san fernando': 'San Fernando',
  'tres de febrero': 'Tres de Febrero',
  hurlingham: 'Hurlingham',
  avellaneda: 'Avellaneda',
  'lomas de zamora': 'Lomas de Zamora',
  'jose ingenieros': 'Tres de Febrero',
  'ramos mejia': 'La Matanza Norte',
  'san justo': 'La Matanza Norte',
  ciudadela: 'Tres de Febrero',
  caseros: 'Tres de Febrero',
  'villa ballester': 'San Martin',
  olivos: 'Vicente Lopez',
  florida: 'Vicente Lopez',
  martinez: 'San Isidro',
  benavidez: 'Tigre',
  'rincon de milberg': 'Tigre',
  'bella vista': 'San Miguel',
  libertad: 'Merlo',
  'bernal oeste': 'Quilmes',
  bernal: 'Quilmes',
  'arturo segui': 'La Plata Norte',
  berisso: 'Berisso',
};

const SKIP_LOCALITY_LINES = new Set([
  'residencial',
  'comercial',
  'sucursal',
  'agencia',
  'colecta',
  'flex',
]);


export interface FlexLabelParsed {
  pageIndex: number;
  labelIndex: number;
  sourcePage: number;
  rawLocality: string;
  locality: string | null;
  zone: FlexZoneId | null;
  date: Date | null;
  dateId: string | null;
  postalCode: string | null;
  saleId: string | null;
}

export interface FlexLabelImportRow {
  key: string;
  date: Date;
  dateId: string;
  locality: string;
  zone: FlexZoneId;
  quantity: number;
  total: number;
  pages: number[];
}

export interface FlexLabelsParseResult {
  labels: FlexLabelParsed[];
  matched: FlexLabelImportRow[];
  unmatched: FlexLabelParsed[];
  totalPages: number;
  totalLabels: number;
}

export function normalizeFlexText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[./#,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveFlexLocality(raw: string): { locality: string; zone: FlexZoneId } | null {
  const needle = normalizeFlexText(raw);
  if (!needle) return null;

  const alias = LOCALITY_ALIASES[needle];
  if (alias) {
    const zone = findZoneForLocality(alias);
    if (zone) return { locality: alias, zone };
  }

  for (const locality of FLEX_ALL_LOCALITIES) {
    if (normalizeFlexText(locality) === needle) {
      const zone = findZoneForLocality(locality);
      if (zone) return { locality, zone };
    }
  }

  // Contiene el nombre de una localidad conocida (prioridad a la más larga).
  const byLength = [...FLEX_ALL_LOCALITIES].sort(
    (a, b) => normalizeFlexText(b).length - normalizeFlexText(a).length
  );
  for (const locality of byLength) {
    const norm = normalizeFlexText(locality);
    if (norm.length < 4) continue;
    if (needle === norm || needle.startsWith(`${norm} `) || needle.includes(` ${norm}`)) {
      const zone = findZoneForLocality(locality);
      if (zone) return { locality, zone };
    }
  }

  for (const zone of FLEX_ZONE_IDS) {
    for (const locality of FLEX_LOCALITIES[zone]) {
      const norm = normalizeFlexText(locality);
      if (needle === norm) return { locality, zone };
    }
  }

  return null;
}

export function parseFlexLabelDate(
  text: string,
  referenceYear = new Date().getFullYear()
): Date | null {
  const match = text.match(/\bFLEX\s+(\d{1,2})\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ.]+)\b/i);
  if (!match) return null;
  const day = Number(match[1]);
  const monthKey = normalizeFlexText(match[2].replace(/\./g, ''));
  const month = MONTHS[monthKey];
  if (!Number.isFinite(day) || day < 1 || day > 31 || month === undefined) return null;
  return new Date(referenceYear, month, day, 12, 0, 0);
}

function extractPostalCode(text: string): string | null {
  const match = text.match(/\bCP:\s*(\d{4})\b/i);
  return match?.[1] ?? null;
}

function extractSaleId(text: string): string | null {
  const match =
    text.match(/\b(?:Pack ID|Venta ID):\s*([\d\s]+)/i) ||
    text.match(/\bVenta:\s*([\d\s]+)/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, '');
}

/**
 * ML suele poner 2–3 etiquetas por página.
 * Cada etiqueta empieza con "Pack ID: … Recort…" o "Venta ID: … Recort…".
 * (Ignora el Pack ID intermedio sin "Recort", que repite el número partido.)
 */
export function splitMercadoLibreLabelTexts(pageTexts: string[]): Array<{
  text: string;
  sourcePage: number;
}> {
  const segments: Array<{ text: string; sourcePage: number }> = [];

  pageTexts.forEach((pageText, pageIndex) => {
    const text = pageText.trim();
    if (!text) return;

    const starts: number[] = [];
    const re = /(?:^|\n)\s*((?:Pack ID|Venta ID):\s*\d+\s+Recort)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      starts.push(match.index + match[0].indexOf(match[1]));
    }

    if (starts.length === 0) {
      const flexStarts: number[] = [];
      const flexRe = /\bFLEX\s+\d{1,2}\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ.]+/gi;
      let flexMatch: RegExpExecArray | null;
      while ((flexMatch = flexRe.exec(text)) !== null) {
        flexStarts.push(flexMatch.index);
      }
      if (flexStarts.length <= 1) {
        segments.push({ text, sourcePage: pageIndex + 1 });
        return;
      }
      for (let i = 0; i < flexStarts.length; i++) {
        const from = i === 0 ? 0 : flexStarts[i];
        const to = i + 1 < flexStarts.length ? flexStarts[i + 1] : text.length;
        const chunk = text.slice(from, to).trim();
        if (chunk) segments.push({ text: chunk, sourcePage: pageIndex + 1 });
      }
      return;
    }

    for (let i = 0; i < starts.length; i++) {
      const from = starts[i];
      const to = i + 1 < starts.length ? starts[i + 1] : text.length;
      const chunk = text.slice(from, to).trim();
      if (chunk) segments.push({ text: chunk, sourcePage: pageIndex + 1 });
    }
  });

  return segments;
}

function extractRawLocality(text: string): string {
  const candidates: string[] = [];

  // Tras CP: línea de partido/localidad Flex (CABA, TIGRE, LA MATANZA NORTE, …)
  const cpBlock = text.match(
    /\bCP:\s*\d{4}\s*[\n\r]+\s*([^\n\r]+)/i
  );
  if (cpBlock?.[1]) candidates.push(cpBlock[1].trim());

  // Texto aplanado: CP: 1407 CABA PARQUE AVELLANEDA RESIDENCIAL
  const cpInline = text.match(
    /\bCP:\s*\d{4}\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .'-]{1,48}?)(?=\s+(?:RESIDENCIAL|COMERCIAL|SUCURSAL|Direccion|Barrio|Referencia|Destinatario|Envio|Venta|Pack|FLEX|CP:)|$)/i
  );
  if (cpInline?.[1]) {
    // Tomar solo la primera “palabra de partido” (hasta barrio)
    const parts = cpInline[1].trim().split(/\s{2,}|\s(?=[A-ZÁÉÍÓÚÜÑ]{3,})/);
    candidates.push(parts[0]?.trim() || cpInline[1].trim());
    candidates.push(cpInline[1].trim());
  }

  const barrio = text.match(/\bBarrio:\s*([^\n\r]+)/i);
  if (barrio?.[1]?.trim()) candidates.push(barrio[1].trim());

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cpIndex = lines.findIndex((l) => /^CP:\s*\d{4}/i.test(l));
  if (cpIndex >= 0) {
    for (let i = cpIndex + 1; i < Math.min(cpIndex + 4, lines.length); i++) {
      const line = lines[i];
      const lower = normalizeFlexText(line);
      if (!lower) continue;
      if (SKIP_LOCALITY_LINES.has(lower)) continue;
      if (/^(direccion|barrio|referencia|destinatario|envio|venta|pack|flex|color|sku)\b/.test(lower)) {
        continue;
      }
      if (/^\d+$/.test(lower)) continue;
      candidates.push(line);
    }
  }

  // Preferir candidatos que resuelven a zona Flex conocida
  for (const candidate of candidates) {
    const resolved = resolveFlexLocality(candidate);
    if (resolved) return resolved.locality;
  }

  // Si vino "CABA PARQUE AVELLANEDA", probar token a token
  for (const candidate of candidates) {
    const tokens = candidate.split(/\s+/);
    for (let len = Math.min(tokens.length, 4); len >= 1; len--) {
      const slice = tokens.slice(0, len).join(' ');
      const resolved = resolveFlexLocality(slice);
      if (resolved) return resolved.locality;
    }
  }

  return candidates[0]?.trim() ?? '';
}

export function parseMercadoLibreFlexLabelPage(
  pageText: string,
  pageIndex: number,
  referenceYear = new Date().getFullYear(),
  meta?: { labelIndex?: number; sourcePage?: number }
): FlexLabelParsed {
  const rawLocality = extractRawLocality(pageText);
  const resolved = rawLocality ? resolveFlexLocality(rawLocality) : null;
  const date = parseFlexLabelDate(pageText, referenceYear);
  const labelIndex = meta?.labelIndex ?? pageIndex;

  return {
    pageIndex: labelIndex,
    labelIndex,
    sourcePage: meta?.sourcePage ?? pageIndex + 1,
    rawLocality,
    locality: resolved?.locality ?? null,
    zone: resolved?.zone ?? null,
    date,
    dateId: date ? dateToFlexId(date) : null,
    postalCode: extractPostalCode(pageText),
    saleId: extractSaleId(pageText),
  };
}

function aggregateMatched(
  matchedLabels: Array<
    FlexLabelParsed & { locality: string; zone: FlexZoneId; date: Date; dateId: string }
  >
): FlexLabelImportRow[] {
  const groups = new Map<string, FlexLabelImportRow>();
  for (const label of matchedLabels) {
    const key = `${label.dateId}::${label.zone}::${label.locality}`;
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.total = calcFlexLineTotal(existing.zone, existing.quantity);
      existing.pages.push(label.sourcePage);
    } else {
      groups.set(key, {
        key,
        date: label.date,
        dateId: label.dateId,
        locality: label.locality,
        zone: label.zone,
        quantity: 1,
        total: calcFlexLineTotal(label.zone, 1),
        pages: [label.sourcePage],
      });
    }
  }
  return [...groups.values()].sort(
    (a, b) => a.dateId.localeCompare(b.dateId) || a.locality.localeCompare(b.locality, 'es')
  );
}

export function parseMercadoLibreFlexLabels(
  pageTexts: string[],
  options?: { referenceYear?: number }
): FlexLabelsParseResult {
  const referenceYear = options?.referenceYear ?? new Date().getFullYear();
  const segments = splitMercadoLibreLabelTexts(pageTexts);

  const labels = segments.map((segment, index) =>
    parseMercadoLibreFlexLabelPage(segment.text, index, referenceYear, {
      labelIndex: index,
      sourcePage: segment.sourcePage,
    })
  );

  const unmatched = labels.filter((l) => !l.locality || !l.zone || !l.date);
  const matchedLabels = labels.filter(
    (l): l is FlexLabelParsed & {
      locality: string;
      zone: FlexZoneId;
      date: Date;
      dateId: string;
    } => Boolean(l.locality && l.zone && l.date && l.dateId)
  );

  return {
    labels,
    matched: aggregateMatched(matchedLabels),
    unmatched,
    totalPages: pageTexts.length,
    totalLabels: labels.length,
  };
}

/** Reconstruye filas de importación aplicando overrides de localidad por etiqueta. */
export function buildFlexImportRows(
  labels: FlexLabelParsed[],
  localityOverrides: Record<number, string> = {}
): { matched: FlexLabelImportRow[]; unmatched: FlexLabelParsed[] } {
  const effective: Array<
    FlexLabelParsed & { locality: string; zone: FlexZoneId; date: Date; dateId: string }
  > = [];
  const unmatched: FlexLabelParsed[] = [];

  for (const label of labels) {
    const overrideKey = label.labelIndex ?? label.pageIndex;
    const override = localityOverrides[overrideKey]?.trim();
    const resolved = override
      ? resolveFlexLocality(override)
      : label.locality && label.zone
        ? { locality: label.locality, zone: label.zone }
        : label.rawLocality
          ? resolveFlexLocality(label.rawLocality)
          : null;

    if (!resolved || !label.date || !label.dateId) {
      unmatched.push({
        ...label,
        locality: resolved?.locality ?? label.locality,
        zone: resolved?.zone ?? label.zone,
      });
      continue;
    }

    effective.push({
      ...label,
      locality: resolved.locality,
      zone: resolved.zone,
      date: label.date,
      dateId: label.dateId,
    });
  }

  return { matched: aggregateMatched(effective), unmatched };
}
