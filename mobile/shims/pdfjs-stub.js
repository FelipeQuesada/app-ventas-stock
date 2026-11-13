/**
 * Stub nativo: pdfjs-dist usa import.meta y campos privados (#x)
 * que Hermes no soporta. El parseo de etiquetas Flex PDF queda en web.
 */
export const GlobalWorkerOptions = { workerSrc: '' };

export function getDocument() {
  throw new Error(
    'La importación de etiquetas PDF de Flex no está disponible en la app móvil. Usá la versión web de Control+.'
  );
}

export default {
  GlobalWorkerOptions,
  getDocument,
};
