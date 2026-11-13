/**
 * Stub nativo: exceljs provoca RangeError (Maximum call stack size exceeded) en Hermes.
 * Los exports Excel quedan disponibles en web; en mobile usamos xlsx u otros caminos.
 */
class Workbook {
  constructor() {
    throw new Error(
      'Exportar a Excel con plantilla avanzada no está disponible en la app móvil. Usá la versión web o el export XLSX básico.'
    );
  }
}

module.exports = { Workbook };
module.exports.default = { Workbook };
