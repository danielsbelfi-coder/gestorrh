const { DIAS_MES_COMERCIAL } = require("./dias_pago.js")

function valorHoraOrdinaria(sueldoBase, horasSemanales) {
    return (sueldoBase / 30 * 28) / (horasSemanales * 4)
}

function agruparVariables(variables) {
    const grupos = new Map()

    for (const variable of variables) {
        const codigo = variable.concepto.codigo

        if (!grupos.has(codigo)) {
            grupos.set(codigo, { concepto: variable.concepto, cantidad: 0, monto: 0 })
        }

        const grupo = grupos.get(codigo)
        grupo.cantidad += Number(variable.cantidad ?? 0)
        grupo.monto += Number(variable.monto ?? 0)
    }

    return [...grupos.values()]
}

function sumarSegun(lineas, marca) {
    return lineas.reduce((suma, linea) => {
        if (!linea.concepto[marca]) {
            return suma
        }

        return linea.concepto.tipo === "haber" ? suma + linea.monto : suma - linea.monto
    }, 0)
}

function calcularLineasBase({ sueldoBase, horasSemanales, diasPagados, variables, minutosAtraso, ingresoMinimoMensual, conceptos }) {
    const valorHora = valorHoraOrdinaria(sueldoBase, horasSemanales)
    const lineas = []

    lineas.push({
        concepto: conceptos.SUELDO_BASE,
        cantidad: diasPagados,
        monto: Math.round(sueldoBase * diasPagados / DIAS_MES_COMERCIAL)
    })

    for (const grupo of agruparVariables(variables)) {
        if (grupo.concepto.recargo_hora_extra !== null) {
            const recargo = Number(grupo.concepto.recargo_hora_extra)

            lineas.push({
                concepto: grupo.concepto,
                cantidad: grupo.cantidad,
                monto: Math.round(grupo.cantidad * valorHora * (1 + recargo / 100))
            })
        } else {
            lineas.push({ concepto: grupo.concepto, cantidad: null, monto: grupo.monto })
        }
    }

    if (minutosAtraso > 0) {
        lineas.push({
            concepto: conceptos.DESCUENTO_ATRASOS,
            cantidad: minutosAtraso,
            monto: Math.round(minutosAtraso / 60 * valorHora)
        })
    }

    const baseGratificacion = sumarSegun(lineas, "base_gratificacion")
    const topeGratificacion = 4.75 * ingresoMinimoMensual / 12
    const montoGratificacion = Math.round(Math.max(0, Math.min(baseGratificacion * 0.25, topeGratificacion)))

    if (montoGratificacion > 0) {
        lineas.push({ concepto: conceptos.GRATIFICACION, cantidad: null, monto: montoGratificacion })
    }

    return { lineas, valorHora, baseGratificacion, topeGratificacion }
}

function buscarTramo(tramos, baseEnUTM) {
    const tramo = tramos.find((t) => baseEnUTM >= t.desdeUTM && (t.hastaUTM === null || baseEnUTM < t.hastaUTM))

    if (!tramo) {
        throw new Error("No existe un tramo de impuesto para la base calculada")
    }

    return tramo
}

function calcularLiquidacionPorLineas(datos) {
    const { tasaAfp, tasaSalud, planSaludUF, topeImponibleUF, valorUF, valorUTM, tasaCesantia, topeCesantiaUF, tramos, saldoPendiente, conceptos } = datos

    const base = calcularLineasBase(datos)
    const lineas = base.lineas

    const rentaImponible = Math.max(0, sumarSegun(lineas, "imponible"))
    const topeImponible = Math.round(topeImponibleUF * valorUF)
    const baseCotizaciones = Math.min(rentaImponible, topeImponible)

    const descuentoAFP = Math.round(baseCotizaciones * tasaAfp / 100)
    const descuentoSaludLegal = Math.round(baseCotizaciones * tasaSalud / 100)
    const descuentoPlanPactado = Math.round(planSaludUF * valorUF)
    const descuentoSalud = Math.max(descuentoSaludLegal, descuentoPlanPactado)
    const descuentoAdicionalIsapre = Math.max(0, descuentoPlanPactado - descuentoSaludLegal)

    const topeCesantia = Math.round(topeCesantiaUF * valorUF)
    const baseCesantia = Math.min(rentaImponible, topeCesantia)
    const descuentoCesantia = Math.round(baseCesantia * tasaCesantia / 100)

    const baseTributable = Math.max(0, sumarSegun(lineas, "tributable") - (descuentoAFP + descuentoSaludLegal + descuentoCesantia))
    const baseEnUTM = baseTributable / valorUTM
    const tramo = buscarTramo(tramos, baseEnUTM)
    const montoImpuestoUnico = Math.round(Math.max(0, baseTributable * tramo.tasa / 100 - tramo.rebajaUTM * valorUTM))

    const legales = [
        { concepto: conceptos.AFP, monto: descuentoAFP },
        { concepto: conceptos.SALUD, monto: descuentoSaludLegal },
        { concepto: conceptos.SALUD_ADICIONAL_ISAPRE, monto: descuentoAdicionalIsapre },
        { concepto: conceptos.CESANTIA, monto: descuentoCesantia },
        { concepto: conceptos.IMPUESTO_UNICO, monto: montoImpuestoUnico },
        { concepto: conceptos.DESCUENTO_PAGO_EXCESO, monto: saldoPendiente }
    ]

    for (const legal of legales) {
        if (legal.monto > 0) {
            lineas.push({ concepto: legal.concepto, cantidad: null, monto: legal.monto })
        }
    }

    const sumarTipo = (tipo) => lineas.filter((l) => l.concepto.tipo === tipo).reduce((suma, l) => suma + l.monto, 0)

    let totalHaberes = sumarTipo("haber")
    const totalDescuentos = sumarTipo("descuento")
    let liquidoAPagar = totalHaberes - totalDescuentos
    let nuevoSaldoPendiente = 0

    if (liquidoAPagar < 0) {
        nuevoSaldoPendiente = -liquidoAPagar
        lineas.push({ concepto: conceptos.AJUSTE_PAGO_EXCESO, cantidad: null, monto: nuevoSaldoPendiente })
        totalHaberes += nuevoSaldoPendiente
        liquidoAPagar = 0
    }

    return {
        ...base,
        lineas,
        rentaImponible,
        topeImponible,
        baseCotizaciones,
        descuentoSaludLegal,
        descuentoPlanPactado,
        descuentoAdicionalIsapre,
        topeCesantia,
        baseCesantia,
        baseTributable,
        baseEnUTM,
        tramo,
        totalHaberes,
        totalDescuentos,
        liquidoAPagar,
        nuevoSaldoPendiente
    }
}

module.exports = {
    calcularLineasBase,
    sumarSegun,
    valorHoraOrdinaria,
    calcularLiquidacionPorLineas
}