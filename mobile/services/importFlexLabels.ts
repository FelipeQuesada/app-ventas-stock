import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import {
  parseMercadoLibreFlexLabels,
  type FlexLabelsParseResult,
} from '@advance-coat/shared';

// Sin worker (React Native / Expo)
GlobalWorkerOptions.workerSrc = '';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary =
    typeof atob === 'function'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function extractPageTextsFromData(data: Uint8Array): Promise<string[]> {
  const doc = await getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
  }).promise;

  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const parts: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = 'transform' in item ? Number(item.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(lastY - y) > 2) {
        parts.push('\n');
      } else if (parts.length > 0 && !parts[parts.length - 1].endsWith('\n')) {
        parts.push(' ');
      }
      parts.push(String(item.str));
      if (y !== null) lastY = y;
    }
    texts.push(parts.join('').replace(/[ \t]+\n/g, '\n').trim());
  }
  return texts;
}

export async function parseFlexLabelsPdfUri(
  uri: string,
  options?: { referenceYear?: number }
): Promise<FlexLabelsParseResult> {
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  const data = base64ToUint8Array(base64);
  const pageTexts = await extractPageTextsFromData(data);
  if (pageTexts.length === 0) {
    throw new Error('El PDF no tiene páginas');
  }
  const result = parseMercadoLibreFlexLabels(pageTexts, options);
  if (result.labels.every((l) => !l.rawLocality && !l.date)) {
    throw new Error(
      'No se detectaron etiquetas Flex en el PDF. ¿Es el archivo de etiquetas de Mercado Libre?'
    );
  }
  return result;
}
