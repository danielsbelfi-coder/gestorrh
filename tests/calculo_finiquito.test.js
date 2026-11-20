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

    assert.deepStrictEqual(bases, { fijos: 50000, variables: 60000, variablesIndemnizacion: 60000, gratificacion: 205792, baseFeriado: 930000, baseIndemnizacion: 1135792 })
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
test("bases: la semana corrida (2104) entra al promedio de variables (art. 71 inc. 5° y art. 172)", () => {
    const bases = basesFiniquito({
        sueldoMensual: 600000,
        meses: [{ 2103: 300000, 2104: 75000 }, { 2103: 210000, 2104: 50000 }, { 2103: 90000, 2104: 25000 }]
    })
    assert.deepStrictEqual([bases.variables, bases.baseFeriado], [250000, 850000])
})

test("bases: el feriado usa los meses trabajados completos; la indemnización, los 3 últimos meses calendario", () => {
    const bases = basesFiniquito({
        sueldoMensual: 600000,
        meses: [{ 2103: 30000 }, { 2103: 300000 }, { 2103: 300000 }],
        mesesFeriado: [{ 2103: 300000 }, { 2103: 300000 }, { 2103: 270000 }]
    })
    assert.strictEqual(bases.variables, 290000)
    assert.strictEqual(bases.baseFeriado, 890000)
    assert.strictEqual(bases.variablesIndemnizacion, 210000)
    assert.strictEqual(bases.baseIndemnizacion, 810000)
})

test("obra o faena (Ley 21.122): 2,5 días por mes trabajado y fracción superior a 15 días, base topada en 90 UF", () => {
    const { indemnizacionObraFaena, montosFiniquito, tiempoServido } = require("../src/remuneraciones/calculo_finiquito.js")
    // 03-08-2026 al 13-02-2027: 6 meses y 11 días → 6 meses → 15 días.
    assert.deepStrictEqual(indemnizacionObraFaena(tiempoServido("2026-08-03", "2027-02-13")), { meses: 6, dias: 15 })
    // 02-11-2026 al 31-01-2027: 2 meses y 30 días → 3 meses → 7,5 días.
    assert.deepStrictEqual(indemnizacionObraFaena(tiempoServido("2026-11-02", "2027-01-31")), { meses: 3, dias: 7.5 })
    // 16 días de fracción suman un mes; 15 no.
    assert.deepStrictEqual(indemnizacionObraFaena({ anios: 0, meses: 2, dias: 16 }), { meses: 3, dias: 7.5 })
    assert.deepStrictEqual(indemnizacionObraFaena({ anios: 0, meses: 2, dias: 15 }), { meses: 2, dias: 5 })
    // Menos de un mes: no corresponde.
    assert.deepStrictEqual(indemnizacionObraFaena({ anios: 0, meses: 0, dias: 28 }), { meses: 0, dias: 0 })

    const base = { avisoPrevioDado: true, tiempo: { anios: 0, meses: 6, dias: 11 }, baseIndemnizacion: 1200000, baseFeriado: 900000, topeUF: 90, valorUF: 40000, diasPendientes: 0, diasInhabiles: 0, imputacionAfc: 20000, descuentos: [] }
    const obra = montosFiniquito({ ...base, causal: 7, obraFaena: true })
    assert.strictEqual(obra.montoAniosServicio, 600000) // 1.200.000 / 30 × 15
    assert.strictEqual(obra.imputacion, 20000)
    assert.deepStrictEqual(obra.indemnizacionObra, { meses: 6, dias: 15 })
    // Misma causal con contrato indefinido, o contrato por obra con otra causal: no corresponde.
    assert.strictEqual(montosFiniquito({ ...base, causal: 7, obraFaena: false }).montoAniosServicio, 0)
    assert.strictEqual(montosFiniquito({ ...base, causal: 4, obraFaena: true }).montoAniosServicio, 0)
    // Tope de 90 UF en la base.
    assert.strictEqual(montosFiniquito({ ...base, causal: 7, obraFaena: true, baseIndemnizacion: 5000000 }).montoAniosServicio, Math.round(3600000 / 30 * 15))
})

test("contrato por día: sin semana corrida en el promedio (ya está en el sueldo × 30)", () => {
    const { basesFiniquito } = require("../src/remuneraciones/calculo_finiquito.js")
    const meses = [{ 2104: 150000, 2112: 60000, 2106: 190000 }]
    const conSC = basesFiniquito({ sueldoMensual: 960000, meses })
    const sinSC = basesFiniquito({ sueldoMensual: 960000, meses, sinSemanaCorrida: true })
    assert.strictEqual(conSC.variables, 210000)
    assert.strictEqual(sinSC.variables, 60000)
    assert.strictEqual(sinSC.baseFeriado, 1020000)
})

test("sin meses anteriores con liquidación: la base de indemnización lleva la gratificación de un mes completo", () => {
    const { basesFiniquito } = require("../src/remuneraciones/calculo_finiquito.js")
    const sin = basesFiniquito({ sueldoMensual: 600000, meses: [], gratificacionSinHistorial: 150000 })
    assert.equal(sin.gratificacion, 150000)
    assert.equal(sin.baseIndemnizacion, 750000)
    assert.equal(sin.baseFeriado, 600000)
    // Con meses anteriores manda el promedio de esos meses (la proyección no se usa).
    const con = basesFiniquito({ sueldoMensual: 600000, meses: [{ 2106: 100000 }], gratificacionSinHistorial: 150000 })
    assert.equal(con.gratificacion, 100000)
})
