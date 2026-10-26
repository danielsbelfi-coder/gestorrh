const test = require("node:test")
const assert = require("node:assert")
const { calcularDiasPago, diasLicenciaEnMes } = require("../src/remuneraciones/dias_pago.js")

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

const licencia = (inicio, termino) => ({ fecha_inicio: inicio, fecha_termino: termino })

function pagadosConLicencia(anio, mes, licencias) {
    const resumen = { dias_inasistencia: 0, dias_permiso_sin_goce: 0, dias_licencia_medica: diasLicenciaEnMes(licencias, anio, mes) }
    return calcularDiasPago({ anio, mes, fechaIngreso: "2026-01-01", fechaTermino: null, resumen }).diasPagados
}

test("licencia del 25 al 31 de julio: 7 días, se pagan 23", () => {
    assert.strictEqual(pagadosConLicencia(2027, 7, [licencia("2027-07-25", "2027-07-31")]), 23)
})

test("licencia todo julio: se pagan 0", () => {
    assert.strictEqual(pagadosConLicencia(2027, 7, [licencia("2027-07-01", "2027-07-31")]), 0)
})

test("licencia todo febrero: se pagan 0", () => {
    assert.strictEqual(pagadosConLicencia(2027, 2, [licencia("2027-02-01", "2027-02-28")]), 0)
})

test("licencia del 1 al 27 de febrero: se pagan 3", () => {
    assert.strictEqual(pagadosConLicencia(2027, 2, [licencia("2027-02-01", "2027-02-27")]), 3)
})

test("licencia del 1 al 30 de julio, vuelve el 31: se paga 1", () => {
    assert.strictEqual(pagadosConLicencia(2027, 7, [licencia("2027-07-01", "2027-07-30")]), 1)
})

test("licencia que cruza de julio a agosto: 7 días en julio y 10 en agosto", () => {
    const cruzada = [licencia("2027-07-25", "2027-08-10")]
    assert.strictEqual(diasLicenciaEnMes(cruzada, 2027, 7), 7)
    assert.strictEqual(diasLicenciaEnMes(cruzada, 2027, 8), 10)
})