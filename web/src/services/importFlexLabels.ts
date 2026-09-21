import {
  parseMercadoLibreFlexLabels,
  type FlexLabelsParseResult,
} from '@advance-coat/shared';

async function loadPdfJs() {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  return pdfjs;
}

export async function extractPdfPageTexts(file: File): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const texts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const parts: string[] = [];
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = 'transform' in item ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(lastY - y) > 2) {
        parts.push('\n');
      } else if (parts.length > 0 && !parts[parts.length - 1].endsWith('\n')) {
        parts.push(' ');
      }
      parts.push(item.str);
      if (y !== null) lastY = y;
    }
    texts.push(parts.join('').replace(/[ \t]+\n/g, '\n').trim());
  }
  return texts;
}

export async function parseFlexLabelsPdf(
  file: File,
  options?: { referenceYear?: number }
): Promise<FlexLabelsParseResult> {
  const pageTexts = await extractPdfPageTexts(file);
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
