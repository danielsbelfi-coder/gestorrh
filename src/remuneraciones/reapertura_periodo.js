// Reglas para reabrir un periodo cerrado (funciones puras, sin base de datos).

const MOTIVO_MINIMO = 10
const MOTIVO_MAXIMO = 500

function validarMotivo(motivo) {
    const texto = typeof motivo === "string" ? motivo.trim() : ""

    if (texto.length < MOTIVO_MINIMO) {
        return { error: `Indica el motivo de la reapertura (al menos ${MOTIVO_MINIMO} caracteres)` }
    }
    if (texto.length > MOTIVO_MAXIMO) {
        return { error: `El motivo no puede superar los ${MOTIVO_MAXIMO} caracteres` }
    }

    return { motivo: texto }
}

const indiceMes = (p) => p.anio * 12 + p.mes
const textoMes = (p) => `${String(p.mes).padStart(2, "0")}/${p.anio}`

// periodo: el que se quiere reabrir. posteriores: los demás periodos de la empresa, con { mes, anio, estado, emitidas }
// (emitidas = liquidaciones vigentes emitidas de ese periodo).
// Solo se puede reabrir el último periodo cerrado, y solo si los meses siguientes no tienen liquidaciones emitidas:
// de lo contrario los saldos que cada mes arrastra al siguiente quedarían inconsistentes.
function problemasDeReapertura({ periodo, posteriores }) {
    const problemas = []

    if (periodo.estado !== "cerrado") {
        problemas.push("El periodo no está cerrado")
        return problemas
    }

    const siguientes = posteriores
        .filter((p) => indiceMes(p) > indiceMes(periodo))
        .sort((a, b) => indiceMes(a) - indiceMes(b))

    for (const siguiente of siguientes) {
        if (siguiente.estado === "cerrado") {
            problemas.push(`El periodo ${textoMes(siguiente)} también está cerrado: solo se puede reabrir el último periodo cerrado`)
        } else if (siguiente.emitidas > 0) {
            problemas.push(`El periodo ${textoMes(siguiente)} ya tiene ${siguiente.emitidas} liquidación(es) emitida(s)`)
        }
    }

    return problemas
}

module.exports = { validarMotivo, problemasDeReapertura, MOTIVO_MINIMO, MOTIVO_MAXIMO }
