const test = require("node:test")
const assert = require("node:assert")
const { situacionDelMes, tipoCotizante, reglasCotizante } = require("../src/remuneraciones/tipo_cotizante.js")

const situacion = (desde, pensionado, cotiza_afp, tipo_pension = null) => ({ desde, pensionado, cotiza_afp, tipo_pension })

test("situación del mes: hasta febrero no pensionado; desde marzo, pensionado", () => {
    const historial = [situacion("2027-03-01", true, false, "vejez")]

    assert.strictEqual(situacionDelMes(historial, "2027-02-01").pensionado, false)
    assert.strictEqual(situacionDelMes(historial, "2027-02-01").cotiza_afp, true)
    assert.strictEqual(situacionDelMes(historial, "2027-03-01").pensionado, true)
    assert.strictEqual(situacionDelMes(historial, "2027-07-01").pensionado, true)
})

test("situación del mes: con dos cambios, toma el más reciente que ya regía", () => {
    const historial = [situacion("2027-05-01", true, true, "vejez"), situacion("2027-03-01", false, false)]

    assert.strictEqual(situacionDelMes(historial, "2027-04-01").cotiza_afp, false)
    assert.strictEqual(situacionDelMes(historial, "2027-06-01").pensionado, true)
})

test("tipo de cotizante según la situación y la edad", () => {
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", false, true), 40), 0)
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", false, true), 65), 3)
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", false, false), 62), 8)
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", true, true, "vejez"), 66), 1)
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", true, false, "vejez"), 66), 2)
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", true, false, "invalidez_total"), 40), 2)
    assert.strictEqual(tipoCotizante(situacion("2027-01-01", true, true, "invalidez_parcial"), 40), 9)
})

test("reglas: el activo paga todo; el pensionado que cotiza solo AFP; el mayor de 65 sin seguro social", () => {
    assert.deepStrictEqual(reglasCotizante(0), { afp: true, seguroSocial: true, cesantia: true })
    assert.deepStrictEqual(reglasCotizante(1), { afp: true, seguroSocial: false, cesantia: false })
    assert.deepStrictEqual(reglasCotizante(3), { afp: true, seguroSocial: false, cesantia: true })
    assert.deepStrictEqual(reglasCotizante(8), { afp: false, seguroSocial: false, cesantia: true })
})