const test = require("node:test")
const assert = require("node:assert/strict")
const { anotarDiasTrabajados, calcularDiasPago } = require("../src/remuneraciones/dias_pago.js")

const sinAusencias = { dias_inasistencia: 0, dias_licencia_medica: 0, dias_permiso_sin_goce: 0 }

test("mes completo sin ausencias: 30 días trabajados", () => {
    const [r] = anotarDiasTrabajados([{ trabajador_id: 1, ...sinAusencias }], [{ id: 1, fecha_ingreso: "2026-01-01", fecha_termino: null }], 2026, 10)
    assert.equal(r.dias_trabajados, 30)
})

test("inasistencia, licencia y permiso sin goce restan; vacaciones no", () => {
    const [r] = anotarDiasTrabajados(
        [{ trabajador_id: 1, dias_inasistencia: 2, dias_licencia_medica: 3, dias_permiso_sin_goce: 1, dias_vacaciones: 5 }],
        [{ id: 1, fecha_ingreso: "2026-01-01", fecha_termino: null }], 2026, 10)
    assert.equal(r.dias_trabajados, 24)
})

test("ingreso a mitad de mes y término: igual que la liquidación", () => {
    const trabajador = { id: 1, fecha_ingreso: "2026-10-16", fecha_termino: null }
    const [r] = anotarDiasTrabajados([{ trabajador_id: 1, ...sinAusencias }], [trabajador], 2026, 10)
    const esperado = calcularDiasPago({ anio: 2026, mes: 10, fechaIngreso: "2026-10-16", fechaTermino: null, resumen: sinAusencias }).diasPagados
    assert.equal(r.dias_trabajados, esperado)
    assert.equal(r.dias_trabajados, 15)
})

test("conserva los demás campos del resumen y no falla sin trabajador", () => {
    const [r] = anotarDiasTrabajados([{ trabajador_id: 9, minutos_atraso: 12, ...sinAusencias }], [], 2026, 10)
    assert.equal(r.minutos_atraso, 12)
    assert.equal(r.dias_trabajados, 30)
})
