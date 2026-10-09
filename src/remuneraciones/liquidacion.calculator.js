function calcularLiquidacion(datos) {
    const { sueldoBase,
        horasSemanales,
        diasTrabajados,
        diasPeriodo,
        horasExtra,
        recargoHoraExtra,
        ingresoMinimoMensual,
        tasaAfp,
        tasaSalud,
        topeImponibleUF,
        valorUF,
        valorUTM,
        tasaCesantia,
        topeCesantiaUF,
        planSaludUF,
        tramos
    } = datos

    const valorHoraOrdinaria = (sueldoBase / 30 * 28) / (horasSemanales * 4)
    const valorHoraExtra = valorHoraOrdinaria * (1 + recargoHoraExtra / 100)
    const montoHorasExtra = Math.round(horasExtra * valorHoraExtra)
    const sueldoBaseProporcional = Math.round(sueldoBase * diasTrabajados / diasPeriodo)
    const topeMensual = (4.75 * ingresoMinimoMensual) / 12
    const gratificacionCalculada = sueldoBaseProporcional * 0.25
    const montoGratificacion = Math.round(Math.min(gratificacionCalculada, topeMensual))
    const rentaImponible = (sueldoBaseProporcional + montoHorasExtra + montoGratificacion)
    const totalHaberes = rentaImponible
    const topeImponible = Math.round((topeImponibleUF * valorUF))
    const baseCotizaciones = Math.min(rentaImponible, topeImponible)
    const topeCesantia = Math.round(topeCesantiaUF * valorUF)
    const baseCesantia = Math.min(rentaImponible, topeCesantia)
    const descuentoCesantia = Math.round(baseCesantia *(tasaCesantia / 100))
    const descuentoAFP = Math.round(baseCotizaciones * (tasaAfp / 100))
    const descuentoSaludLegal = Math.round(baseCotizaciones * (tasaSalud / 100))
    const descuentoPlanPactado = Math.round(planSaludUF * valorUF)
    const descuentoSalud = Math.max(descuentoSaludLegal, descuentoPlanPactado)
    const baseTributable = (rentaImponible) - (descuentoAFP + descuentoSalud + descuentoCesantia)
    const baseEnUTM = baseTributable / valorUTM
    const tramo = tramos.find(function (t) {
        return baseEnUTM >= t.desdeUTM && (t.hastaUTM === null || baseEnUTM < t.hastaUTM)
    })

    if (!tramo) {
        throw new Error("No existe un tramo de impuesto para la base calculada")
    }

    const montoImpuestoUnico = Math.round(Math.max(0, (baseTributable * tramo.tasa / 100) - (tramo.rebajaUTM * valorUTM)))
    const totalDescuentos = descuentoAFP + descuentoSalud + montoImpuestoUnico + descuentoCesantia
    const liquidoAPagar = totalHaberes - totalDescuentos

    return {
        sueldoBaseProporcional,
        valorHoraOrdinaria,
        valorHoraExtra,
        montoHorasExtra,
        topeMensual,
        montoGratificacion,
        rentaImponible,
        topeImponible,
        baseCotizaciones,
        descuentoAFP,
        descuentoSalud,
        baseTributable,
        baseEnUTM,
        montoImpuestoUnico,
        totalDescuentos,
        liquidoAPagar,
        totalHaberes,
        topeCesantia,
        baseCesantia,
        descuentoCesantia,
        descuentoSaludLegal,
        descuentoPlanPactado,
        tramo
    }


}

module.exports = {
    calcularLiquidacion
}