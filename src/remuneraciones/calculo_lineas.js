const { DIAS_MES_COMERCIAL } = require("./dias_pago.js")
const { calcularAhorros, repartirDepositoConvenido } = require("./ahorro_voluntario.js")

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

function calcularLineasBase({ sueldoBase, horasSemanales, diasPagados, tramosSueldo, variables, minutosAtraso, ingresoMinimoMensual, asignacionFamiliar, relacionAnterior, conceptos }) {
    const valorHora = valorHoraOrdinaria(sueldoBase, horasSemanales)
    const lineas = []

    const tramos = tramosSueldo ?? [{ sueldo: sueldoBase, dias: diasPagados }]

    lineas.push({
        concepto: conceptos.SUELDO_BASE,
        cantidad: diasPagados,
        monto: Math.round(tramos.reduce((suma, tramo) => suma + tramo.sueldo * tramo.dias, 0) / DIAS_MES_COMERCIAL)
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

    // Asignación familiar del mes (no imponible ni tributable): cantidad = número de cargas.
    if (asignacionFamiliar && asignacionFamiliar.monto > 0) {
        lineas.push({
            concepto: conceptos.ASIGNACION_FAMILIAR,
            cantidad: asignacionFamiliar.cargas,
            monto: asignacionFamiliar.monto
        })
    }

    if (minutosAtraso > 0) {
        lineas.push({
            concepto: conceptos.DESCUENTO_ATRASOS,
            cantidad: minutosAtraso,
            monto: Math.round(minutosAtraso / 60 * valorHora)
        })
    }

    const baseGratificacion = sumarSegun(lineas, "base_gratificacion")
    // Con dos relaciones en el mismo mes, el tope de gratificación es uno solo: la segunda usa lo que queda.
    const topeGratificacion = Math.max(0, 4.75 * ingresoMinimoMensual / 12 - Number(relacionAnterior?.gratificacion ?? 0))
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

// Descuentos del trabajador por APV y depósito convenido (el aporte del empleador al APVC va con los aportes).
function lineasAhorro(ahorros, conceptos) {
    return [
        ahorros.apvi && { concepto: conceptos[`APVI_${ahorros.apvi.regimen}`], monto: ahorros.apvi.monto },
        ahorros.apvc && { concepto: conceptos[`APVC_${ahorros.apvc.regimen}`], monto: ahorros.apvc.trabajador },
        ahorros.depositoConvenido && { concepto: conceptos.DESCUENTO_DEPOSITO_CONVENIDO, monto: ahorros.depositoConvenido.monto }
    ].filter(Boolean)
}

function calcularLiquidacionPorLineas(datos) {
    const { tasaAfp, tasaSalud, planSaludUF, topeImponibleUF, valorUF, valorUTM, tasaCesantia, topeCesantiaUF, tramos, saldoPendiente, conceptos } = datos

    const base = calcularLineasBase(datos)
    const lineas = base.lineas

    // Dos relaciones en el mismo mes (relacionAnterior): los topes de cotización y de cesantía son del mes,
    // así que esta liquidación usa lo que dejó la anterior; el impuesto se reliquida sobre la suma de ambas bases.
    const anterior = datos.relacionAnterior ?? null
    const rentaImponible = Math.max(0, sumarSegun(lineas, "imponible"))
    const topeImponible = Math.round(topeImponibleUF * valorUF)
    const baseCotizaciones = Math.min(rentaImponible, Math.max(0, topeImponible - Number(anterior?.baseCotizaciones ?? 0)))

    const descuentoAFP = Math.round(baseCotizaciones * tasaAfp / 100)
    const descuentoSaludLegal = Math.round(baseCotizaciones * tasaSalud / 100)
    const descuentoPlanPactado = Math.round(planSaludUF * valorUF)
    const descuentoSalud = Math.max(descuentoSaludLegal, descuentoPlanPactado)
    const descuentoAdicionalIsapre = Math.max(0, descuentoPlanPactado - descuentoSaludLegal)

    const topeCesantia = Math.round(topeCesantiaUF * valorUF)
    const baseCesantia = Math.min(rentaImponible, Math.max(0, topeCesantia - Number(anterior?.baseCesantia ?? 0)))
    const descuentoCesantia = Math.round(baseCesantia * tasaCesantia / 100)

    // APV y depósito convenido vigentes en el mes; el APV régimen B rebaja la base tributable hasta 50 UF.
    const ahorros = calcularAhorros(datos.ahorros ?? [], { valorUF, rentaImponible })

    // Depósito convenido: lo que pasa de 900 UF en el año es un haber tributable (no imponible) y paga impuesto este mes.
    if (ahorros.depositoConvenido) {
        Object.assign(ahorros.depositoConvenido, repartirDepositoConvenido(ahorros.depositoConvenido.monto, Number(datos.depositoConvenidoAcumulado ?? 0), valorUF))
        if (ahorros.depositoConvenido.exceso > 0) {
            lineas.push({ concepto: conceptos.DEPOSITO_CONVENIDO_EXCESO, cantidad: null, monto: ahorros.depositoConvenido.exceso })
        }
    }

    const baseTributable = Math.max(0, sumarSegun(lineas, "tributable") - (descuentoAFP + descuentoSaludLegal + descuentoCesantia) - ahorros.rebajaTributable)
    const baseTributableMes = baseTributable + Number(anterior?.baseTributable ?? 0)
    const baseEnUTM = baseTributableMes / valorUTM
    const tramo = buscarTramo(tramos, baseEnUTM)
    const impuestoDelMes = Math.round(Math.max(0, baseTributableMes * tramo.tasa / 100 - tramo.rebajaUTM * valorUTM))
    const montoImpuestoUnico = Math.max(0, impuestoDelMes - Number(anterior?.impuesto ?? 0))

    const legales = [
        { concepto: conceptos.AFP, monto: descuentoAFP },
        { concepto: conceptos.SALUD, monto: descuentoSaludLegal },
        { concepto: conceptos.SALUD_ADICIONAL_ISAPRE, monto: descuentoAdicionalIsapre },
        { concepto: conceptos.CESANTIA, monto: descuentoCesantia },
        ...lineasAhorro(ahorros, conceptos),
        { concepto: conceptos.IMPUESTO_UNICO, monto: montoImpuestoUnico },
        { concepto: conceptos.DESCUENTO_PAGO_EXCESO, monto: saldoPendiente }
    ]

    for (const legal of legales) {
        if (legal.monto > 0) {
            lineas.push({ concepto: legal.concepto, cantidad: null, monto: legal.monto })
        }
    }

    // El depósito convenido es un haber (no imponible ni tributable hasta el tope anual) que se descuenta completo
    // para enviarlo a la institución; el exceso ya se agregó como haber tributable.
    if (ahorros.depositoConvenido?.exento > 0) {
        lineas.push({ concepto: conceptos.DEPOSITO_CONVENIDO, cantidad: null, monto: ahorros.depositoConvenido.exento })
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
        baseTributableMes,
        baseEnUTM,
        tramo,
        ahorros,
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
    buscarTramo,
    calcularLiquidacionPorLineas
}