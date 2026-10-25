const test = require("node:test")
const assert = require("node:assert")
const { calcularDiasPago } = require("../src/remuneraciones/dias_pago.js")

const SIN_AUSENCIAS = { dias_inasistencia: 0, dias_licencia_medica: 0, dias_permiso_sin_goce: 0 }

function dias(anio, mes, fechaIngreso, fechaTermino, resumen = SIN_AUSENCIAS) {
    return calcularDiasPago({ anio, mes, fechaIngreso, fechaTermino, resumen }).diasPagados
}

test("mes completo: 30 días", () => {
    assert.strictEqual(dias(2027, 7, "2026-01-01", null), 30)
})

test("ingreso el día 9: 22 días", () => {
    assert.strictEqual(dias(2027, 7, "2027-07-09", null), 22)
})

test("ingreso el día 31: se paga 1 día", () => {
    assert.strictEqual(dias(2027, 7, "2027-07-31", null), 1)
})

test("término el día 15: 15 días", () => {
    assert.strictEqual(dias(2027, 7, "2026-01-01", "2027-07-15"), 15)
})

test("término el 30 en un mes de 31: 30 días", () => {
    assert.strictEqual(dias(2027, 7, "2026-01-01", "2027-07-30"), 30)
})

test("término el 31: 30 días", () => {
    assert.strictEqual(dias(2027, 7, "2026-01-01", "2027-07-31"), 30)
})

test("término el 28 de febrero: 30 días", () => {
    assert.strictEqual(dias(2027, 2, "2026-01-01", "2027-02-28"), 30)
})

test("contrato del 5 al 10 del mismo mes: 6 días", () => {
    assert.strictEqual(dias(2027, 7, "2027-07-05", "2027-07-10"), 6)
})

test("mes completo con 1 inasistencia y 2 días de licencia: 27 días", () => {
    const resumen = { dias_inasistencia: 1, dias_licencia_medica: 2, dias_permiso_sin_goce: 0 }
    assert.strictEqual(dias(2027, 7, "2026-01-01", null, resumen), 27)
})