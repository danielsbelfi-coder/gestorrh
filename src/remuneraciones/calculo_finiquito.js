const { sumarDias } = require("../shared/fechas.js")

const TOPE_ANIOS_INDEMNIZACION = 11
const DIAS_FERIADO_ANUAL = 15

function tiempoServido(desde, hasta) {
    const fin = sumarDias(hasta, 1)
    let anios = Number(fin.slice(0, 4)) - Number(desde.slice(0, 4))
    let meses = Number(fin.slice(5, 7)) - Number(desde.slice(5, 7))
    let dias = Number(fin.slice(8, 10)) - Number(desde.slice(8, 10))

    if (dias < 0) {
        meses -= 1
        const anioMes = Number(fin.slice(0, 4))
        const mesAnterior = Number(fin.slice(5, 7)) - 1
        dias += new Date(Date.UTC(anioMes, mesAnterior, 0)).getUTCDate()
    }
    if (meses < 0) {
        anios -= 1
        meses += 12
    }

    return { anios, meses, dias }
}

function aniosIndemnizacion(tiempo) {
    const fraccionSobreSeisMeses = tiempo.meses > 6 || (tiempo.meses === 6 && tiempo.dias > 0)
    return Math.min(TOPE_ANIOS_INDEMNIZACION, tiempo.anios + (fraccionSobreSeisMeses ? 1 : 0))
}

function diasFeriadoGanados(tiempo) {
    const porMes = DIAS_FERIADO_ANUAL / 12
    const dias = tiempo.anios * DIAS_FERIADO_ANUAL + tiempo.meses * porMes + tiempo.dias * porMes / 30
    return Math.round(dias * 100) / 100
}

const CODIGOS_FIJOS = [2111]
// Variables promediadas (comisiones, semana corrida, tratos, bonos variables). La semana corrida entra al feriado por el
// art. 71 inciso 5° y a la última remuneración mensual del art. 172 (toda cantidad percibida por los servicios).
const CODIGOS_VARIABLES = [2103, 2104, 2112, 2113]
const CODIGO_GRATIFICACION = 2106
const CAUSALES_ART_161 = [18, 19]
// Art. 159 N° 5: conclusión del trabajo o servicio que dio origen al contrato.
const CAUSAL_CONCLUSION_OBRA = 7
const DIAS_POR_MES_OBRA = 2.5

// Indemnización por término de obra o faena (Ley 21.122, art. 163 inciso 3° del Código del Trabajo): si el contrato por
// obra o faena terminó por el art. 159 N° 5 y estuvo vigente un mes o más, 2,5 días de remuneración por cada mes
// trabajado y fracción superior a 15 días, con la base del art. 172 (tope de 90 UF). Devuelve los meses y los días.
function indemnizacionObraFaena(tiempo) {
    const mesesCompletos = tiempo.anios * 12 + tiempo.meses
    if (mesesCompletos < 1) {
        return { meses: 0, dias: 0 }
    }
    const meses = mesesCompletos + (tiempo.dias > 15 ? 1 : 0)
    return { meses, dias: meses * DIAS_POR_MES_OBRA }
}

// meses: montos de los últimos 3 meses calendario (indemnización, art. 172). mesesFeriado: los de los últimos 3 meses
// trabajados completos (feriado, art. 71); por defecto, los mismos.
// sinSemanaCorrida: contrato por día, cuyo sueldo mensual (× 30) ya incluye los domingos y festivos.
// gratificacionSinHistorial: sin meses anteriores con liquidación (el trabajador termina en su primer mes, o la empresa
// empezó a usar el sistema), la gratificación mensual que corresponde a un mes completo (25 % del sueldo mensual con el
// tope mensual de 4,75 IMM / 12), si la liquidación del mes del término paga gratificación. Ver «Paquete S» en el SPEC.
function basesFiniquito({ sueldoMensual, meses, mesesFeriado = meses, sinSemanaCorrida = false, gratificacionSinHistorial = 0 }) {
    const sumaCodigos = (montos, codigos) => codigos.reduce((suma, codigo) => suma + (montos[codigo] ?? 0), 0)
    const promedio = (lista, codigos) => lista.length === 0
        ? 0
        : Math.round(lista.reduce((suma, montos) => suma + sumaCodigos(montos, codigos), 0) / lista.length)

    const codigosVariables = sinSemanaCorrida ? CODIGOS_VARIABLES.filter((c) => c !== 2104) : CODIGOS_VARIABLES
    const fijos = meses.length > 0 ? sumaCodigos(meses[0], CODIGOS_FIJOS) : 0
    const variables = promedio(mesesFeriado, codigosVariables)
    const variablesIndemnizacion = promedio(meses, codigosVariables)
    const gratificacion = meses.length > 0 ? promedio(meses, [CODIGO_GRATIFICACION]) : gratificacionSinHistorial
    const baseFeriado = sueldoMensual + fijos + variables

    return { fijos, variables, variablesIndemnizacion, gratificacion, baseFeriado, baseIndemnizacion: sueldoMensual + fijos + variablesIndemnizacion + gratificacion }
}

// obraFaena: el contrato de la relación es por obra o faena (con la causal 159 N° 5 da la indemnización de la Ley 21.122).
function montosFiniquito({ causal, avisoPrevioDado, tiempo, baseIndemnizacion, baseFeriado, topeUF, valorUF, diasPendientes, diasInhabiles, imputacionAfc, descuentos, obraFaena = false }) {
    const art161 = CAUSALES_ART_161.includes(causal)
    const baseTopada = Math.min(baseIndemnizacion, Math.round(topeUF * valorUF))
    const anios = aniosIndemnizacion(tiempo)
    const obra = obraFaena && causal === CAUSAL_CONCLUSION_OBRA ? indemnizacionObraFaena(tiempo) : { meses: 0, dias: 0 }

    const montoAniosServicio = art161 && tiempo.anios >= 1
        ? baseTopada * anios
        : Math.round(baseTopada / 30 * obra.dias)
    const montoAvisoPrevio = art161 && !avisoPrevioDado ? baseTopada : 0
    const diasFeriado = Math.round((diasPendientes + diasInhabiles) * 100) / 100
    const montoFeriado = Math.round(baseFeriado / 30 * diasFeriado)

    // Imputación del seguro de cesantía: art. 161 y, por la Ley 21.122 (art. 13 inc. 2° Ley 19.728), la de obra o faena.
    const imputacion = art161 || obra.dias > 0 ? Math.min(imputacionAfc, montoAniosServicio) : 0
    const totalDescuentos = imputacion + descuentos.reduce((suma, descuento) => suma + descuento.monto, 0)
    const totalHaberes = montoFeriado + montoAvisoPrevio + montoAniosServicio

    if (totalDescuentos > totalHaberes) {
        throw new Error("Los descuentos superan los haberes del finiquito")
    }

    return {
        anios, baseTopada, diasFeriado, imputacion,
        indemnizacionObra: obra.dias > 0 ? obra : null,
        montoFeriado, montoAvisoPrevio, montoAniosServicio,
        totalHaberes, totalDescuentos, totalAPagar: totalHaberes - totalDescuentos
    }
}

module.exports = {
    tiempoServido,
    aniosIndemnizacion,
    diasFeriadoGanados,
    basesFiniquito,
    montosFiniquito,
    indemnizacionObraFaena
}