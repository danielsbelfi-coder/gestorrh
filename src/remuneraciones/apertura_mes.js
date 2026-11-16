// Reglas puras de «Abrir mes» de los parámetros legales (sin base de datos).

// Valores que cambian todos los meses y se cargan con el dato oficial: «Abrir mes» no los copia, para que el mes
// quede «Incompleto» hasta cargarlos y no se calcule con el valor del mes anterior sin darse cuenta.
// (Octubre 2026: la UF y la UTM de octubre se copiaron a noviembre y nadie lo notó.)
const CODIGOS_DEL_MES = ["UF", "UTM"]

// Parámetros del mes de origen que se copian: los que el destino todavía no tiene, menos la UF y la UTM.
function parametrosACopiar(parametrosOrigen, codigosExistentes) {
    const existentes = codigosExistentes instanceof Set ? codigosExistentes : new Set(codigosExistentes)
    return parametrosOrigen.filter((p) => !existentes.has(p.codigo) && !CODIGOS_DEL_MES.includes(p.codigo))
}

// UF y UTM que el destino aún no tiene y hay que cargar a mano.
function codigosSinCopiar(codigosExistentes) {
    const existentes = codigosExistentes instanceof Set ? codigosExistentes : new Set(codigosExistentes)
    return CODIGOS_DEL_MES.filter((codigo) => !existentes.has(codigo))
}

module.exports = { CODIGOS_DEL_MES, parametrosACopiar, codigosSinCopiar }
