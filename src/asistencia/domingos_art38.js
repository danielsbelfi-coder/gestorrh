// Descanso dominical de los exceptuados del art. 38 (paquete AE). Reglas puras a partir del contrato y del libro.
// - Art. 38 inc. 4°: los trabajadores de los N° 2 y N° 7 tienen al menos 2 días de descanso en domingo por mes
//   calendario, salvo contratos de 30 días o menos, jornadas de 20 horas semanales o menos y quienes fueron contratados
//   solo para sábados, domingos o festivos.
// - Art. 38 inc. 2° (solo N° 7): las horas ordinarias trabajadas en domingo llevan a lo menos un 30 % de recargo; la
//   hora extra de domingo se calcula sobre la hora ordinaria con ese recargo.
// - Art. 38 bis (solo N° 7): 7 domingos adicionales al año (paquete aparte).

const TEXTO_CAUSAL = { n2: "N° 2", n7: "N° 7", otra: "otra causal" }

function diasDelContrato(contrato) {
    if (!contrato.fecha_termino || contrato.tipo_contrato === "indefinido") {
        return null
    }
    const inicio = Date.parse(`${String(contrato.fecha_inicio).slice(0, 10)}T00:00:00Z`)
    const fin = Date.parse(`${String(contrato.fecha_termino).slice(0, 10)}T00:00:00Z`)
    return Math.round((fin - inicio) / 86400000) + 1
}

function reglasDomingo(contrato) {
    const causal = contrato?.art38_causal ?? "ninguna"
    const n7 = causal === "n7"
    const excepciones = []
    if (contrato?.solo_fin_semana) {
        excepciones.push("contratado solo para sábados, domingos o festivos")
    }
    if (contrato && Number(contrato.horas_semanales) <= 20) {
        excepciones.push("jornada de 20 horas semanales o menos")
    }
    const duracion = contrato ? diasDelContrato(contrato) : null
    if (duracion !== null && duracion <= 30) {
        excepciones.push("contrato de 30 días o menos")
    }
    return {
        causal,
        textoCausal: TEXTO_CAUSAL[causal] ?? null,
        n7,
        recargo: n7 ? Number(contrato.recargo_domingo ?? 30) : 0,
        dosDomingos: (causal === "n2" || n7) && excepciones.length === 0,
        excepciones
    }
}

// Aviso si el mes tiene menos domingos libres de los que corresponden (2, o los domingos disponibles si son menos).
function avisoDosDomingos(reglas, totales, domingosDelMes) {
    if (!reglas.dosDomingos) {
        return null
    }
    const disponibles = domingosDelMes - Number(totales.domingos_no_disponibles ?? 0)
    const requeridos = Math.min(2, Math.max(0, disponibles))
    const libres = Number(totales.domingos_libres ?? 0)
    if (libres >= requeridos) {
        return null
    }
    return `Descanso dominical (art. 38 inc. 4°, ${reglas.textoCausal}): el mes tiene ${libres} domingo(s) libre(s) y corresponden al menos ${requeridos}. Da los domingos libres en la jornada (semanal rotativa) o con la anotación «Domingo libre (art. 38)»`
}

module.exports = { reglasDomingo, avisoDosDomingos }
