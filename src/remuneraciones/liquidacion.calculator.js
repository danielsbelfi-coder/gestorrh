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
        tramos
    } = datos

    const valorHoraOrdinaria = (sueldoBase / 30 * 28) / (horasSemanales * 4)
    const valorHoraExtra = valorHoraOrdinaria * (1 + recargoHoraExtra / 100)
    const montoHorasExtra = horasExtra * valorHoraExtra
    const sueldoBaseProporcional = sueldoBase * diasTrabajados / diasPeriodo
    const topeMensual = (4.75 * ingresoMinimoMensual) / 12
    const gratificacionCalculada = sueldoBaseProporcional * 0.25
    const montoGratificacion = Math.min(gratificacionCalculada, topeMensual)
    const rentaImponible = (sueldoBaseProporcional + montoHorasExtra + montoGratificacion)
    const totalHaberes = rentaImponible
    const topeImponible = (topeImponibleUF * valorUF)
    const baseCotizaciones = Math.min(rentaImponible, topeImponible)
    const descuentoAFP = baseCotizaciones * (tasaAfp / 100)
    const descuentoSalud = baseCotizaciones * (tasaSalud / 100)
    const baseTributable = (rentaImponible) - (descuentoAFP + descuentoSalud)
    const baseEnUTM = baseTributable / valorUTM
    const tramo = tramos.find(function (t) {
        return baseEnUTM >= t.desdeUTM && (t.hastaUTM === null || baseEnUTM < t.hastaUTM)
    })

    if (!tramo) {
        throw new Error("No existe un tramo de impuesto para la base calculada")
    }

    const montoImpuestoUnico = Math.max(0, (baseTributable * tramo.tasa / 100) - (tramo.rebajaUTM * valorUTM))
    const totalDescuentos = descuentoAFP + descuentoSalud
    const liquidoAPagar = totalHaberes - totalDescuentos - montoImpuestoUnico

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
        tramo
    }


}

module.exports = {
    calcularLiquidacion
}