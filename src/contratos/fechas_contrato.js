// Límites de las fechas de un contrato y de sus anexos (funciones puras). Ver «Contrato firmado por error» en el SPEC.
// Evitan errores de digitación del año (caso de la prueba 2: un contrato con inicio en 2096 en vez de 2026), que dejan
// al trabajador con un contrato vigente imposible de liquidar.
const { esFechaValida } = require("../shared/fechas.js")

const FECHA_MINIMA = "1950-01-01"
const MESES_HACIA_ADELANTE = 12
// Plazo fijo: hasta 1 año, o 2 años para gerentes, profesionales y técnicos (art. 159 N° 4 del Código del Trabajo).
const ANIOS_PLAZO_FIJO = 2
// Fecha de término en un anexo o en obra o faena: tope de digitación, no legal.
const ANIOS_TERMINO = 5

const anioMas = (iso, anios) => `${Number(iso.slice(0, 4)) + anios}${iso.slice(4)}`
const fechaChilena = (iso) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`

// Fecha más lejana permitida para el inicio de un contrato o la vigencia de un anexo: hoy + 12 meses.
function limiteHaciaAdelante(hoy) {
    return anioMas(hoy, MESES_HACIA_ADELANTE / 12)
}

// datos: { tipo_contrato, fecha_inicio, fecha_termino }. hoy: AAAA-MM-DD. Devuelve la lista de errores.
function erroresFechasContrato(datos, hoy) {
    const errores = []
    const inicio = datos.fecha_inicio
    if (typeof inicio !== "string" || !esFechaValida(inicio)) {
        return ["Fecha de inicio del contrato inválida"]
    }
    if (inicio < FECHA_MINIMA) {
        errores.push(`La fecha de inicio (${fechaChilena(inicio)}) es anterior a 1950: revisa el año`)
    }
    if (inicio > limiteHaciaAdelante(hoy)) {
        errores.push(`La fecha de inicio (${fechaChilena(inicio)}) es más de un año posterior a hoy: revisa el año`)
    }

    const termino = datos.fecha_termino
    if (termino !== undefined && termino !== null && termino !== "") {
        if (typeof termino !== "string" || !esFechaValida(termino)) {
            errores.push("Fecha de término del contrato inválida")
        } else if (termino < inicio) {
            errores.push("La fecha de término no puede ser anterior a la de inicio")
        } else if (datos.tipo_contrato === "plazo_fijo" && termino > anioMas(inicio, ANIOS_PLAZO_FIJO)) {
            errores.push(`Un contrato a plazo fijo dura como máximo 2 años (art. 159 N° 4): la fecha de término (${fechaChilena(termino)}) es posterior a ${fechaChilena(anioMas(inicio, ANIOS_PLAZO_FIJO))}. Revisa el año`)
        } else if (termino > anioMas(inicio, ANIOS_TERMINO)) {
            errores.push(`La fecha de término (${fechaChilena(termino)}) es más de ${ANIOS_TERMINO} años posterior al inicio: revisa el año`)
        }
    }
    return errores
}

// Vigencia de un anexo: válida, desde el inicio del contrato y no más de un año después de hoy.
function errorVigenciaAnexo(fechaVigencia, contrato, hoy) {
    if (typeof fechaVigencia !== "string" || !esFechaValida(fechaVigencia)) {
        return "Indica la fecha desde la que rige el anexo (AAAA-MM-DD)"
    }
    if (fechaVigencia < contrato.fecha_inicio) {
        return `El anexo no puede regir antes del inicio del contrato (${fechaChilena(contrato.fecha_inicio)})`
    }
    if (fechaVigencia > limiteHaciaAdelante(hoy)) {
        return `La vigencia del anexo (${fechaChilena(fechaVigencia)}) es más de un año posterior a hoy: revisa el año`
    }
    return null
}

// Nueva fecha de término por anexo (renovación): válida, no anterior a la vigencia y con el mismo tope de digitación.
function errorTerminoAnexo(fechaTermino, fechaVigencia, contrato) {
    if (typeof fechaTermino !== "string" || !esFechaValida(fechaTermino)) {
        return "La nueva fecha de término debe ser una fecha válida (AAAA-MM-DD)"
    }
    if (fechaTermino < fechaVigencia) {
        return "La nueva fecha de término no puede ser anterior a la vigencia del anexo"
    }
    if (fechaTermino > anioMas(contrato.fecha_inicio, ANIOS_TERMINO)) {
        return `La nueva fecha de término (${fechaChilena(fechaTermino)}) es más de ${ANIOS_TERMINO} años posterior al inicio del contrato: revisa el año`
    }
    return null
}

// Hoy en Chile (AAAA-MM-DD).
function hoyEnChile(ahora = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora)
}

module.exports = { erroresFechasContrato, errorVigenciaAnexo, errorTerminoAnexo, limiteHaciaAdelante, hoyEnChile }
