// DJ 1887 (sueldos, art. 42 N° 1) y Certificado N° 6: cálculo puro a partir de los montos de cada mes.
// Formato simple del Importador del SII, AT2024 en adelante (35 columnas separadas por punto y coma).

const MESES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const HORAS_SIN_JORNADA = 99
const CAMPOS_ANUALES = ["rentaNeta", "impuesto", "mayorRetencion", "noGravada", "exenta", "zonas", "prestamo"]

// Código del mes: F en el mes del término; A/B agrícola y C/P no agrícola según la jornada.
function codigoMes({ agricola, jornada, termina }) {
    if (termina) {
        return "F"
    }
    const parcial = jornada === "parcial"
    if (agricola) {
        return parcial ? "B" : "A"
    }
    return parcial ? "P" : "C"
}

function horasDeContrato(contrato) {
    if (!contrato || contrato.tipo_jornada === "excluido_limitacion") {
        return HORAS_SIN_JORNADA
    }
    return Math.round(Number(contrato.horas_semanales))
}

// Los 12 factores del año, uno por mes. Devuelve los meses que faltan o están fuera de rango.
function problemasFactores(factores) {
    return MESES.filter((mes) => {
        const factor = Number(factores?.[mes])
        return !Number.isFinite(factor) || factor <= 0 || factor >= 3
    })
}

const cero = () => Object.fromEntries(CAMPOS_ANUALES.map((campo) => [campo, 0]))

function armarFila(persona, agricola, factores) {
    const meses = []
    const codigos = []
    const mensual = []
    const anual = cero()
    const sinActualizar = { ...cero(), leyesSociales: 0, imponible: 0 }
    let imponibleActualizado = 0

    for (const mes of MESES) {
        const datos = persona.meses[mes]
        if (!datos) {
            codigos.push("")
            mensual.push(null)
            continue
        }

        const factor = Number(factores[mes])
        const montos = {
            rentaNeta: datos.rentaNeta,
            impuesto: datos.impuesto,
            mayorRetencion: 0,
            noGravada: datos.noGravada,
            exenta: 0,
            zonas: 0,
            prestamo: 0
        }
        const actualizado = Object.fromEntries(CAMPOS_ANUALES.map((campo) => [campo, Math.round(montos[campo] * factor)]))

        for (const campo of CAMPOS_ANUALES) {
            anual[campo] += actualizado[campo]
            sinActualizar[campo] += montos[campo]
        }
        sinActualizar.leyesSociales += datos.leyesSociales
        sinActualizar.imponible += datos.imponible
        imponibleActualizado += Math.round(datos.imponible * factor)

        codigos.push(codigoMes({ agricola, jornada: datos.jornada, termina: datos.termina }))
        mensual.push(montos.rentaNeta + montos.zonas)
        meses.push({ mes, bruto: datos.bruto, cotizaciones: datos.bruto - datos.rentaNeta, ...montos, factor, actualizado })
    }

    return {
        persona_id: persona.persona_id,
        rut: String(persona.rut),
        dv: String(persona.dv).toUpperCase(),
        nombre: persona.nombre,
        horas: persona.horas,
        codigos,
        mensual,
        meses,
        anual,
        sinActualizar,
        imponibleActualizado
    }
}

// personas: [{ persona_id, rut, dv, nombre, horas, meses: { [mes]: { bruto, rentaNeta, impuesto, noGravada,
// imponible, leyesSociales, jornada, termina } } }]; factores: { [mes]: factor }.
function armarDj1887({ agricola, factores, personas }) {
    const filas = personas
        .filter((persona) => Object.keys(persona.meses).length > 0)
        .map((persona) => armarFila(persona, agricola, factores))
        .sort((a, b) => Number(a.rut) - Number(b.rut))
        .map((fila, indice) => ({ numero: indice + 1, certificado: indice + 1, ...fila }))

    const sumar = (elegir) => filas.reduce((suma, fila) => suma + elegir(fila), 0)
    const actualizados = Object.fromEntries(CAMPOS_ANUALES.map((campo) => [campo, sumar((f) => f.anual[campo])]))
    const sinActualizar = {
        ...Object.fromEntries(CAMPOS_ANUALES.map((campo) => [campo, sumar((f) => f.sinActualizar[campo])])),
        impuestoAbril: 0,
        leyesSociales: sumar((f) => f.sinActualizar.leyesSociales)
    }

    return {
        filas,
        resumen: {
            casos: filas.length,
            actualizados,
            sinActualizar,
            imponiblesActualizadas: sumar((f) => f.imponibleActualizado)
        }
    }
}

// Una línea del archivo: C1 RUT, C2 DV, C3–C9 montos anuales actualizados, C10–C21 código de cada mes,
// C22 N° de certificado, C23–C34 monto mensual sin actualizar (vacío si no hubo renta), C35 horas.
function lineaCsv(fila) {
    return [
        fila.rut,
        fila.dv,
        ...CAMPOS_ANUALES.map((campo) => fila.anual[campo]),
        ...fila.codigos,
        fila.certificado,
        ...fila.mensual.map((monto) => (monto === null ? "" : monto)),
        fila.horas
    ].join(";")
}

function archivoDj1887(filas) {
    return filas.map(lineaCsv).join("\r\n") + "\r\n"
}

module.exports = {
    MESES,
    HORAS_SIN_JORNADA,
    codigoMes,
    horasDeContrato,
    problemasFactores,
    armarDj1887,
    lineaCsv,
    archivoDj1887
}
