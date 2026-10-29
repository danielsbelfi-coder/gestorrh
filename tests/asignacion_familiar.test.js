const test = require("node:test")
const assert = require("node:assert/strict")
const a = require("../src/remuneraciones/asignacion_familiar.js")

const MONTOS = { A: 22601, B: 13870, C: 4382 }

test("tramoDelMes: el vigente el primer día del mes", () => {
    const filas = [
        { id: 1, desde: "2026-01-01", tramo: "B" },
        { id: 2, desde: "2026-07-01", tramo: "A" }
    ]
    assert.equal(a.tramoDelMes(filas, 2025, 12), null)
    assert.equal(a.tramoDelMes(filas, 2026, 1).id, 1)
    assert.equal(a.tramoDelMes(filas, 2026, 6).id, 1)
    assert.equal(a.tramoDelMes(filas, 2026, 7).id, 2)
    assert.equal(a.tramoDelMes([...filas].reverse(), 2026, 12).id, 2)
    assert.equal(a.tramoDelMes([], 2026, 5), null)
})

test("cargasDelMes: cuenta la carga vigente al menos un día del mes", () => {
    const cargas = [
        { id: 1, desde: "2026-03-15", hasta: null },
        { id: 2, desde: "2025-01-01", hasta: "2026-03-01" },
        { id: 3, desde: "2026-04-01", hasta: "2026-04-30" },
        { id: 4, desde: "2025-01-01", hasta: "2026-02-28" }
    ]
    const ids = (anio, mes) => a.cargasDelMes(cargas, anio, mes).map((c) => c.id)
    assert.deepEqual(ids(2026, 2), [2, 4])
    assert.deepEqual(ids(2026, 3), [1, 2])
    assert.deepEqual(ids(2026, 4), [1, 3])
    assert.deepEqual(ids(2026, 5), [1])
    // Fin de mes de febrero en año bisiesto.
    assert.deepEqual(a.cargasDelMes([{ desde: "2028-02-29", hasta: null }], 2028, 2).length, 1)
})

test("calcularAsignacion: unitario por carga simple y maternal, duplo por invalidez", () => {
    const cargas = [{ tipo: "simple" }, { tipo: "simple" }, { tipo: "maternal" }, { tipo: "invalidez" }]
    const r = a.calcularAsignacion({ tramo: "A", cargas, montos: MONTOS })
    assert.deepEqual(r, { tramo: "A", simples: 2, maternales: 1, invalidez: 1, unitario: 22601, monto: 22601 * 3 + 45202 })
    assert.equal(a.calcularAsignacion({ tramo: "C", cargas: [{ tipo: "simple" }], montos: MONTOS }).monto, 4382)
})

test("calcularAsignacion: tramo D informa las cargas pero no paga", () => {
    const r = a.calcularAsignacion({ tramo: "D", cargas: [{ tipo: "simple" }], montos: MONTOS })
    assert.equal(r.simples, 1)
    assert.equal(r.monto, 0)
    assert.equal(r.unitario, 0)
})

test("calcularAsignacion: sin cargas no exige tramo", () => {
    assert.deepEqual(a.calcularAsignacion({ tramo: null, cargas: [], montos: MONTOS }),
        { tramo: null, simples: 0, maternales: 0, invalidez: 0, unitario: 0, monto: 0 })
    assert.equal(a.calcularAsignacion({ tramo: "B", cargas: [], montos: MONTOS }).monto, 0)
})

test("calcularAsignacion: cargas sin tramo o sin monto del tramo → error", () => {
    assert.throws(() => a.calcularAsignacion({ tramo: null, cargas: [{ tipo: "simple" }], montos: MONTOS }), /no tiene tramo/)
    assert.throws(() => a.calcularAsignacion({ tramo: "B", cargas: [{ tipo: "simple" }], montos: { A: 1 } }), /Falta el monto/)
})

test("validarTramo y normalizarTramo", () => {
    assert.deepEqual(a.validarTramo({ desde: "2026-07", tramo: "b" }), [])
    assert.equal(a.validarTramo({ desde: "2026-13", tramo: "A" }).length, 1)
    assert.equal(a.validarTramo({ desde: "2026-07", tramo: "E" }).length, 1)
    assert.equal(a.validarTramo({}).length, 2)
    assert.deepEqual(a.normalizarTramo({ desde: "2026-07", tramo: "b", documento: "  Res. 123  " }), { desde: "2026-07-01", tramo: "B", documento: "Res. 123" })
    assert.equal(a.normalizarTramo({ desde: "2026-07", tramo: "A", documento: " " }).documento, null)
})

test("validarCarga: datos mínimos y fechas", () => {
    const base = { nombre: "Tomás Rojas", relacion: "hijo", tipo: "simple", desde: "2026-03-01" }
    assert.deepEqual(a.validarCarga(base), [])
    assert.deepEqual(a.validarCarga({ ...base, hasta: "2030-03-01" }), [])
    assert.equal(a.validarCarga({ ...base, hasta: "2026-02-28" }).length, 1)
    assert.equal(a.validarCarga({ ...base, desde: "2026-02-30" }).length, 1)
    assert.equal(a.validarCarga({ ...base, nombre: " " }).length, 1)
    assert.equal(a.validarCarga({ ...base, relacion: "primo" }).length, 1)
    assert.equal(a.validarCarga({ ...base, tipo: "doble" }).length, 1)
    assert.equal(a.validarCarga({}).length, 4)
})

test("validarCarga: el RUT es opcional, pero si viene debe ser válido", () => {
    const base = { nombre: "Tomás Rojas", relacion: "hijo", tipo: "simple", desde: "2026-03-01" }
    assert.deepEqual(a.validarCarga({ ...base, rut: "12.345.678", dv: "5" }), [])
    assert.equal(a.validarCarga({ ...base, rut: "12345678", dv: "4" }).length, 1)
    assert.equal(a.validarCarga({ ...base, rut: "", dv: "5" }).length, 1)
})

test("normalizarCarga", () => {
    const c = a.normalizarCarga({ nombre: " Ana ", relacion: "propia", tipo: "maternal", desde: "2026-05-01", hasta: "", rut: "12.345.678", dv: "5", documento: "" })
    assert.deepEqual(c, { rut: "12345678", dv: "5", nombre: "Ana", relacion: "propia", tipo: "maternal", desde: "2026-05-01", hasta: null, documento: null })
    assert.equal(a.normalizarCarga({ nombre: "X", relacion: "hijo", tipo: "simple", desde: "2026-05-01" }).rut, null)
})

test("mesesCerradosEnRango", () => {
    const cerrados = [{ anio: 2026, mes: 7 }, { anio: 2026, mes: 8 }, { anio: 2026, mes: 9 }, { anio: 2026, mes: 8 }]
    assert.deepEqual(a.mesesCerradosEnRango("2026-08-15", null, cerrados), ["2026-08", "2026-09"])
    assert.deepEqual(a.mesesCerradosEnRango("2026-01-01", "2026-07-31", cerrados), ["2026-07"])
    assert.deepEqual(a.mesesCerradosEnRango("2026-10-01", null, cerrados), [])
})
