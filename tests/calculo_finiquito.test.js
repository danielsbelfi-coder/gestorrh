const test = require("node:test")
const assert = require("node:assert")
const { tiempoServido, aniosIndemnizacion, diasFeriadoGanados, basesFiniquito, montosFiniquito } = require("../src/remuneraciones/calculo_finiquito.js")

test("tiempo servido: cuenta el día de término y pide prestado mes y año cuando hace falta", () => {
    assert.deepStrictEqual(tiempoServido("2020-01-01", "2020-12-31"), { anios: 1, meses: 0, dias: 0 })
    assert.deepStrictEqual(tiempoServido("2018-01-04", "2024-12-27"), { anios: 6, meses: 11, dias: 24 })
    assert.deepStrictEqual(tiempoServido("2025-03-15", "2025-05-10"), { anios: 0, meses: 1, dias: 26 })
})

test("años de indemnización: la fracción cuenta solo si supera los 6 meses; tope de 11", () => {
    assert.strictEqual(aniosIndemnizacion({ anios: 6, meses: 11, dias: 24 }), 7)
    assert.strictEqual(aniosIndemnizacion({ anios: 3, meses: 6, dias: 0 }), 3)
    assert.strictEqual(aniosIndemnizacion({ anios: 3, meses: 6, dias: 1 }), 4)
    assert.strictEqual(aniosIndemnizacion({ anios: 15, meses: 2, dias: 0 }), 11)
})

test("feriado ganado: 15 por año, 1,25 por mes y la proporción de los días", () => {
    assert.strictEqual(diasFeriadoGanados({ anios: 1, meses: 0, dias: 0 }), 15)
    assert.strictEqual(diasFeriadoGanados({ anios: 6, meses: 11, dias: 24 }), 104.75)
    assert.strictEqual(diasFeriadoGanados({ anios: 0, meses: 1, dias: 26 }), 2.33)
})

test("bases: sueldo del contrato, fijos del último mes, promedio de variables y gratificación", () => {
    const bases = basesFiniquito({
        sueldoMensual: 820000,
        meses: [
            { 2101: 820000, 2111: 50000, 2113: 90000, 2106: 214460 },
            { 2101: 738000, 2111: 50000, 2113: 60000, 2106: 197917 },
            { 2101: 820000, 2113: 30000, 2106: 205000 }
        ]
    })

    assert.deepStrictEqual(bases, { fijos: 50000, variables: 60000, gratificacion: 205792, baseFeriado: 930000, baseIndemnizacion: 1135792 })
})

test("bases: sin meses anteriores, solo el sueldo", () => {
    assert.deepStrictEqual(basesFiniquito({ sueldoMensual: 820000, meses: [] }).baseIndemnizacion, 820000)
})

const despido = {
    causal: 18, avisoPrevioDado: false, tiempo: { anios: 6, meses: 11, dias: 24 },
    baseIndemnizacion: 1135792, baseFeriado: 930000, topeUF: 90, valorUF: 41000,
    diasPendientes: 10.75, diasInhabiles: 4, imputacionAfc: 1500000,
    descuentos: [{ glosa: "Préstamo", monto: 100000 }]
}

test("necesidades de la empresa sin aviso: 7 años, aviso previo, feriado, imputación y descuentos", () => {
    const montos = montosFiniquito(despido)

    assert.strictEqual(montos.anios, 7)
    assert.strictEqual(montos.montoAniosServicio, 7950544)
    assert.strictEqual(montos.montoAvisoPrevio, 1135792)
    assert.strictEqual(montos.montoFeriado, 457250)
    assert.strictEqual(montos.totalDescuentos, 1600000)
    assert.strictEqual(montos.totalAPagar, 7943586)
})

test("renuncia: solo feriado; no hay indemnizaciones ni imputación", () => {
    const montos = montosFiniquito({ ...despido, causal: 4, descuentos: [] })

    assert.deepStrictEqual([montos.montoAniosServicio, montos.montoAvisoPrevio, montos.imputacion], [0, 0, 0])
    assert.strictEqual(montos.totalAPagar, 457250)
})

test("tope de 90 UF, aviso dado y menos de un año: sin años de servicio ni aviso previo", () => {
    const altoSueldo = montosFiniquito({ ...despido, baseIndemnizacion: 5000000 })
    const nuevo = montosFiniquito({ ...despido, avisoPrevioDado: true, tiempo: { anios: 0, meses: 8, dias: 0 }, imputacionAfc: 0, descuentos: [] })

    assert.strictEqual(altoSueldo.baseTopada, 3690000)
    assert.strictEqual(altoSueldo.montoAniosServicio, 25830000)
    assert.deepStrictEqual([nuevo.montoAniosServicio, nuevo.montoAvisoPrevio], [0, 0])
})

test("descuentos mayores que los haberes: error", () => {
    assert.throws(() => montosFiniquito({ ...despido, causal: 4, descuentos: [{ glosa: "Préstamo", monto: 9000000 }] }), /superan los haberes/)
})