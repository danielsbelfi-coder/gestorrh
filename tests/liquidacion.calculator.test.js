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
    assert.ok(Math.abs(resultado.montoGratificacion - 197916.67) < 0.01)
    assert.ok(Math.abs(resultado.rentaImponible - 1127916.67) < 0.01)
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

    assert.ok(Math.abs(resultado.rentaImponible - 30197916.67) < 0.01)
    assert.ok(Math.abs(resultado.topeImponible - 3200000) < 0.01)
    assert.ok(Math.abs(resultado.baseCotizaciones - 3200000) < 0.01)
    assert.ok(Math.abs(resultado.descuentoAFP - 344640) < 0.01)
    assert.ok(Math.abs(resultado.descuentoSalud - 224000) < 0.01)
    assert.ok(Math.abs(resultado.baseTributable - 29629276.67) < 0.01)
    assert.ok(Math.abs(resultado.montoImpuestoUnico - 3708102.35) < 0.01)
    assert.ok(Math.abs(resultado.liquidoAPagar - 25921174.32) < 0.01)
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