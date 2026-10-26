const test = require("node:test")
const assert = require("node:assert")
const { calcularAportesEmpleador } = require("../src/remuneraciones/aportes_empleador.js")

const CONCEPTOS = Object.fromEntries([
    "APORTE_CESANTIA", "APORTE_MUTUAL", "APORTE_SANNA",
    "APORTE_SIS", "APORTE_EXPECTATIVA_VIDA", "APORTE_CUENTA_INDIVIDUAL", "APORTE_RENTABILIDAD_PROTEGIDA"
].map((codigo) => [codigo, { codigo, tipo: "aporte_empleador" }]))

const TASAS = { cesantia: 2.4, mutual: 1.85, sanna: 0.03, sis: 1.78, expectativaVida: 0.72, cuentaIndividual: 0.1, rentabilidadProtegida: 0.9 }

function monto(resultado, codigo) {
    const aporte = resultado.aportes.find((a) => a.concepto.codigo === codigo)
    return aporte ? aporte.monto : 0
}

test("liquidación 30: imponible 1.072.299, indefinido, mutual 0,90 + 0,95", () => {
    const r = calcularAportesEmpleador({ baseCotizaciones: 1072299, baseCesantia: 1072299, tasas: TASAS, conceptos: CONCEPTOS })

    assert.strictEqual(monto(r, "APORTE_CESANTIA"), 25735)
    assert.strictEqual(monto(r, "APORTE_MUTUAL"), 19838)
    assert.strictEqual(monto(r, "APORTE_SANNA"), 322)
    assert.strictEqual(monto(r, "APORTE_SIS"), 19087)
    assert.strictEqual(monto(r, "APORTE_EXPECTATIVA_VIDA"), 7721)
    assert.strictEqual(monto(r, "APORTE_CUENTA_INDIVIDUAL"), 1072)
    assert.strictEqual(monto(r, "APORTE_RENTABILIDAD_PROTEGIDA"), 9651)
    assert.strictEqual(r.totalAportes, 83426)
})

test("sueldo alto: la cesantía usa su tope (135,2 UF) y el resto el de 90 UF", () => {
    const r = calcularAportesEmpleador({
        baseCotizaciones: 3600000, baseCesantia: 5408000,
        tasas: { ...TASAS, cesantia: 3.0, mutual: 0.9 }, conceptos: CONCEPTOS
    })

    assert.strictEqual(monto(r, "APORTE_CESANTIA"), 162240)
    assert.strictEqual(monto(r, "APORTE_MUTUAL"), 32400)
    assert.strictEqual(monto(r, "APORTE_SIS"), 64080)
    assert.strictEqual(monto(r, "APORTE_EXPECTATIVA_VIDA"), 25920)
    assert.strictEqual(r.totalAportes, 321720)
})

test("una tasa en 0 no genera línea", () => {
    const r = calcularAportesEmpleador({
        baseCotizaciones: 1072299, baseCesantia: 1072299,
        tasas: { ...TASAS, cesantia: 0 }, conceptos: CONCEPTOS
    })

    assert.strictEqual(r.aportes.length, 6)
    assert.strictEqual(r.aportes.some((a) => a.concepto.codigo === "APORTE_CESANTIA"), false)
    assert.strictEqual(r.totalAportes, 83426 - 25735)
})

test("mes con licencia: el SIS y la expectativa de vida suman la RIMA; los demás no", () => {
    const r = calcularAportesEmpleador({
        baseCotizaciones: 600000, baseCesantia: 600000, baseSeguroSocial: 810000,
        tasas: TASAS, conceptos: CONCEPTOS
    })

    assert.strictEqual(monto(r, "APORTE_SIS"), 14418)
    assert.strictEqual(monto(r, "APORTE_EXPECTATIVA_VIDA"), 5832)
    assert.strictEqual(monto(r, "APORTE_CUENTA_INDIVIDUAL"), 600)
    assert.strictEqual(monto(r, "APORTE_RENTABILIDAD_PROTEGIDA"), 5400)
    assert.strictEqual(monto(r, "APORTE_MUTUAL"), 11100)
})