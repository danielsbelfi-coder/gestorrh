const test = require("node:test")
const assert = require("node:assert")
const { calcularDiasPago, diasLicenciaEnMes, rimaDelMes, diasPorTramo } = require("../src/remuneraciones/dias_pago.js")

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

const conRima = (inicio, termino, rima) => ({ fecha_inicio: inicio, fecha_termino: termino, rima })

test("RIMA: 900.000 con 7 días de licencia en julio → 210.000", () => {
    assert.strictEqual(rimaDelMes([conRima("2027-07-25", "2027-07-31", 900000)], 2027, 7), 210000)
})

test("RIMA: licencia de todo febrero → RIMA completa", () => {
    assert.strictEqual(rimaDelMes([conRima("2027-02-01", "2027-02-28", 900000)], 2027, 2), 900000)
})

test("RIMA: licencia de todo julio (31 días) → RIMA completa, no 31/30", () => {
    assert.strictEqual(rimaDelMes([conRima("2027-07-01", "2027-07-31", 900000)], 2027, 7), 900000)
})

test("RIMA: dos licencias con RIMAs distintas en el mismo mes se suman", () => {
    const licencias = [conRima("2027-07-15", "2027-07-16", 600000), conRima("2027-07-25", "2027-07-31", 900000)]
    assert.strictEqual(rimaDelMes(licencias, 2027, 7), 250000)
})

const aumento15 = [{ desdeDia: 1, sueldo: 600000 }, { desdeDia: 15, sueldo: 700000 }]
const marzo = { tramos: aumento15, anio: 2027, mes: 3, fechaIngreso: "2020-01-01", fechaTermino: null, fechasAusencia: [] }

test("tramos: un solo tramo recibe el total, sin necesitar fechas", () => {
    const resultado = diasPorTramo({ ...marzo, tramos: [{ desdeDia: 1, sueldo: 600000 }], diasPagados: 27, fechasAusencia: [] })
    assert.deepStrictEqual(resultado, [{ desdeDia: 1, sueldo: 600000, dias: 27 }])
})

test("tramos: aumento desde el 15 de marzo, mes completo → 14 y 16", () => {
    assert.deepStrictEqual(diasPorTramo({ ...marzo, diasPagados: 30 }).map((t) => t.dias), [14, 16])
})

test("tramos: la inasistencia del 20 y la del 31 se descuentan del tramo nuevo", () => {
    assert.deepStrictEqual(diasPorTramo({ ...marzo, diasPagados: 29, fechasAusencia: ["2027-03-20"] }).map((t) => t.dias), [14, 15])
    assert.deepStrictEqual(diasPorTramo({ ...marzo, diasPagados: 29, fechasAusencia: ["2027-03-31"] }).map((t) => t.dias), [14, 15])
    assert.deepStrictEqual(diasPorTramo({ ...marzo, diasPagados: 29, fechasAusencia: ["2027-03-05"] }).map((t) => t.dias), [13, 16])
})

test("tramos: ingreso el 10 resta del primer tramo; febrero también suma 30", () => {
    assert.deepStrictEqual(diasPorTramo({ ...marzo, diasPagados: 21, fechaIngreso: "2027-03-10" }).map((t) => t.dias), [5, 16])
    assert.deepStrictEqual(diasPorTramo({ ...marzo, mes: 2, diasPagados: 30 }).map((t) => t.dias), [14, 16])
})

test("tramos: ausente del 1 al 30 de marzo y trabaja el 31 → el día mínimo va al tramo nuevo", () => {
    const fechas = Array.from({ length: 30 }, (_, i) => `2027-03-${String(i + 1).padStart(2, "0")}`)
    assert.deepStrictEqual(diasPorTramo({ ...marzo, diasPagados: 1, fechasAusencia: fechas }).map((t) => t.dias), [0, 1])
})