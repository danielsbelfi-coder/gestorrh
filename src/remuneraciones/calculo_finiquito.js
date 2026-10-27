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
const CODIGOS_VARIABLES = [2103, 2112, 2113]
const CODIGO_GRATIFICACION = 2106
const CAUSALES_ART_161 = [18, 19]

function basesFiniquito({ sueldoMensual, meses }) {
    const sumaCodigos = (montos, codigos) => codigos.reduce((suma, codigo) => suma + (montos[codigo] ?? 0), 0)
    const promedio = (codigos) => meses.length === 0
        ? 0
        : Math.round(meses.reduce((suma, montos) => suma + sumaCodigos(montos, codigos), 0) / meses.length)

    const fijos = meses.length > 0 ? sumaCodigos(meses[0], CODIGOS_FIJOS) : 0
    const variables = promedio(CODIGOS_VARIABLES)
    const gratificacion = promedio([CODIGO_GRATIFICACION])
    const baseFeriado = sueldoMensual + fijos + variables

    return { fijos, variables, gratificacion, baseFeriado, baseIndemnizacion: baseFeriado + gratificacion }
}

function montosFiniquito({ causal, avisoPrevioDado, tiempo, baseIndemnizacion, baseFeriado, topeUF, valorUF, diasPendientes, diasInhabiles, imputacionAfc, descuentos }) {
    const art161 = CAUSALES_ART_161.includes(causal)
    const baseTopada = Math.min(baseIndemnizacion, Math.round(topeUF * valorUF))
    const anios = aniosIndemnizacion(tiempo)

    const montoAniosServicio = art161 && tiempo.anios >= 1 ? baseTopada * anios : 0
    const montoAvisoPrevio = art161 && !avisoPrevioDado ? baseTopada : 0
    const diasFeriado = diasPendientes + diasInhabiles
    const montoFeriado = Math.round(baseFeriado / 30 * diasFeriado)

    const imputacion = art161 ? Math.min(imputacionAfc, montoAniosServicio) : 0
    const totalDescuentos = imputacion + descuentos.reduce((suma, descuento) => suma + descuento.monto, 0)
    const totalHaberes = montoFeriado + montoAvisoPrevio + montoAniosServicio

    if (totalDescuentos > totalHaberes) {
        throw new Error("Los descuentos superan los haberes del finiquito")
    }

    return {
        anios, baseTopada, diasFeriado, imputacion,
        montoFeriado, montoAvisoPrevio, montoAniosServicio,
        totalHaberes, totalDescuentos, totalAPagar: totalHaberes - totalDescuentos
    }
}

module.exports = {
    tiempoServido,
    aniosIndemnizacion,
    diasFeriadoGanados,
    basesFiniquito,
    montosFiniquito
}