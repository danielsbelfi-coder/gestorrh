const test = require("node:test")
const assert = require("node:assert")
const { calcularLiquidacion } = require("../src/remuneraciones/liquidacion.calculator.js")


const TRAMOS = [
    { desdeUTM: 0, hastaUTM: 13.5, tasa: 0, rebajaUTM: 0 },
    { desdeUTM: 13.5, hastaUTM: 30, tasa: 4, rebajaUTM: 0.54 },
    { desdeUTM: 30, hastaUTM: 50, tasa: 8, rebajaUTM: 1.74 },
    { desdeUTM: 50, hastaUTM: null, tasa: 13.5, rebajaUTM: 4.49 }
]

const PARAMETROS = {
    recargoHoraExtra: 50,
    ingresoMinimoMensual: 500000,
    tasaAfp: 10.77,
    tasaSalud: 7,
    topeImponibleUF: 80,
    valorUF: 40000,
    valorUTM: 65000,
    tasaCesantia: 0,
    topeCesantiaUF: 135.2,
    planSaludUF: 0,
    tramos: TRAMOS
}

function conBaseEnUTM(sueldoBase) {
    return calcularLiquidacion({
        ...PARAMETROS,
        ingresoMinimoMensual: 0,
        tasaAfp: 0,
        tasaSalud: 0,
        valorUTM: 100000,
        sueldoBase,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 0
    })
}

test("mes completo con horas extra y gratificación con tope", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 900000,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 4
    })

    assert.strictEqual(resultado.valorHoraOrdinaria, 5000)
    assert.strictEqual(resultado.valorHoraExtra, 7500)
    assert.strictEqual(resultado.montoHorasExtra, 30000)
    assert.ok(Math.abs(resultado.topeMensual - 197916.67) < 0.01)
    assert.strictEqual(resultado.sueldoBaseProporcional, 900000)
    assert.equal(resultado.montoGratificacion, 197917)
    assert.equal(resultado.rentaImponible, 1127917)
})


test("medio mes sin horas extra y gratificación sin tope", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 600000,
        horasSemanales: 42,
        diasTrabajados: 15,
        diasPeriodo: 30,
        horasExtra: 0,
    })

    assert.strictEqual(resultado.sueldoBaseProporcional, 300000)
    assert.strictEqual(resultado.montoHorasExtra, 0)
    assert.ok(Math.abs(resultado.montoGratificacion - 75000) < 0.01)
    assert.ok(Math.abs(resultado.rentaImponible - 375000) < 0.01)
})


test("sueldo alto: tope imponible aplicado e impuesto en el tramo más alto", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 30000000,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 0
    })

    assert.equal(resultado.rentaImponible, 30197917)
    assert.ok(Math.abs(resultado.topeImponible - 3200000) < 0.01)
    assert.ok(Math.abs(resultado.baseCotizaciones - 3200000) < 0.01)
    assert.ok(Math.abs(resultado.descuentoAFP - 344640) < 0.01)
    assert.ok(Math.abs(resultado.descuentoSalud - 224000) < 0.01)
    assert.equal(resultado.baseTributable, 29629277)
    assert.equal(resultado.montoImpuestoUnico, 3708102)
    assert.equal(resultado.liquidoAPagar, 25921175)
    assert.equal(resultado.totalDescuentos, 4276742)
})

test("base de 13,55 UTM cae en el segundo tramo, sin hueco", () => {
    const resultado = conBaseEnUTM(1355000)

    assert.ok(Math.abs(resultado.tramo.tasa - 4) < 0.01)
    assert.ok(Math.abs(resultado.montoImpuestoUnico - 200) < 0.01)

})

test("base exacta de 13,5 UTM: el límite inferior se incluye", () => {
    const resultado = conBaseEnUTM(1350000)

    assert.ok(Math.abs(resultado.tramo.tasa - 4) < 0.01)
    assert.ok(Math.abs(resultado.montoImpuestoUnico - 0) < 0.01)

})

test("redondeo: la AFP con decimal .75 sube al peso siguiente", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 650000,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 0,
        ingresoMinimoMensual: 553553,
        tasaAfp: 11.27,
        tasaSalud: 7,
        topeImponibleUF: 90,
        valorUF: 41057.2,
        valorUTM: 71721
    })

    assert.strictEqual(resultado.montoGratificacion, 162500)
    assert.strictEqual(resultado.rentaImponible, 812500)
    assert.strictEqual(resultado.descuentoAFP, 91569)
    assert.strictEqual(resultado.descuentoSalud, 56875)
})

test("cesantía: tope en UF y redondeo", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 30000000,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 0,
        ingresoMinimoMensual: 553553,
        tasaAfp: 10.58,
        tasaSalud: 7,
        topeImponibleUF: 90,
        valorUF: 41057.2,
        valorUTM: 71721,
        tasaCesantia: 0.6,
        topeCesantiaUF: 135.2
    })

    assert.strictEqual(resultado.baseCesantia, 5550933)
    assert.strictEqual(resultado.descuentoCesantia, 33306)
    assert.strictEqual(resultado.baseTributable, 29536202)
})


test("isapre: sobre el 7% de salud", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 1000000,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 0,
        ingresoMinimoMensual: 553553,
        tasaAfp: 10.58,
        planSaludUF: 5,
        topeImponibleUF: 90,
        valorUF: 41057.2,
        valorUTM: 71721,
        tasaCesantia: 0.6,
        topeCesantiaUF: 135.2
    })

    assert.strictEqual(resultado.descuentoSalud, 205286)
    assert.strictEqual(resultado.descuentoCesantia, 7315)
    assert.strictEqual(resultado.baseTributable, 877532)
})


test("isapre: menor al 7% de salud", () => {
    const resultado = calcularLiquidacion({
        ...PARAMETROS,
        sueldoBase: 1000000,
        horasSemanales: 42,
        diasTrabajados: 30,
        diasPeriodo: 30,
        horasExtra: 0,
        ingresoMinimoMensual: 553553,
        tasaAfp: 10.58,
        planSaludUF: 1.5,
        topeImponibleUF: 90,
        valorUF: 41057.2,
        valorUTM: 71721,
        tasaCesantia: 0.6,
        topeCesantiaUF: 135.2
    })

    assert.strictEqual(resultado.descuentoSalud, 85338)
    assert.strictEqual(resultado.descuentoCesantia, 7315)
    assert.strictEqual(resultado.baseTributable, 997480)
})