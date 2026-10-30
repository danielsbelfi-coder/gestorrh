const test = require("node:test")
const assert = require("node:assert/strict")
const a = require("../src/remuneraciones/ahorro_voluntario.js")

const base = { tipo: "apvi", institucion_codigo: "033", institucion_nombre: "AFP Capital", forma_pago: 1, regimen: "B", modalidad: "uf", monto: "2,5", desde: "2026-09" }

test("validarAhorro: datos completos y errores", () => {
    assert.deepEqual(a.validarAhorro(base), [])
    assert.deepEqual(a.validarAhorro({ ...base, tipo: "deposito_convenido", regimen: undefined, modalidad: "pesos", monto: 100000 }), [])
    assert.equal(a.validarAhorro({ ...base, institucion_codigo: "33" }).length, 1)
    assert.equal(a.validarAhorro({ ...base, institucion_codigo: "000" }).length, 1)
    assert.equal(a.validarAhorro({ ...base, regimen: "C" }).length, 1)
    assert.equal(a.validarAhorro({ ...base, forma_pago: 3 }).length, 1)
    assert.equal(a.validarAhorro({ ...base, modalidad: "porcentaje", monto: 120 }).length, 1)
    assert.equal(a.validarAhorro({ ...base, monto: 0 }).length, 1)
    assert.equal(a.validarAhorro({ ...base, hasta: "2026-08" }).length, 1)
    assert.equal(a.validarAhorro({ ...base, desde: "2026-9" }).length, 1)
    assert.equal(a.validarAhorro({}).length, 8)
})

test("validarAhorro: APVC acepta solo aporte del empleador, pero no ambos en cero", () => {
    const apvc = { ...base, tipo: "apvc", modalidad: "pesos" }
    assert.deepEqual(a.validarAhorro({ ...apvc, monto: 0, aporte_empleador: 30000 }), [])
    assert.deepEqual(a.validarAhorro({ ...apvc, monto: 20000, aporte_empleador: "" }), [])
    assert.equal(a.validarAhorro({ ...apvc, monto: 0, aporte_empleador: 0 }).length, 1)
})

test("normalizarAhorro: meses, coma decimal y campos que no aplican", () => {
    assert.deepEqual(a.normalizarAhorro({ ...base, numero_contrato: " ", hasta: "2027-03", aporte_empleador: 5 }), {
        tipo: "apvi", institucion_codigo: "033", institucion_nombre: "AFP Capital", numero_contrato: null, forma_pago: 1,
        regimen: "B", modalidad: "uf", monto: 2.5, aporte_empleador: null, desde: "2026-09-01", hasta: "2027-03-01"
    })
    assert.equal(a.normalizarAhorro({ ...base, tipo: "deposito_convenido" }).regimen, null)
})

test("ahorrosDelMes y seCruzan", () => {
    const filas = [
        { id: 1, tipo: "apvi", desde: "2026-01-01", hasta: "2026-06-01" },
        { id: 2, tipo: "apvi", desde: "2026-07-01", hasta: null },
        { id: 3, tipo: "apvc", desde: "2026-06-01", hasta: "2026-06-01" }
    ]
    assert.deepEqual(a.ahorrosDelMes(filas, 2026, 6).map((f) => f.id), [1, 3])
    assert.deepEqual(a.ahorrosDelMes(filas, 2026, 7).map((f) => f.id), [2])
    assert.deepEqual(a.ahorrosDelMes(filas, 2025, 12), [])
    assert.equal(a.seCruzan(filas[0], filas[1]), false)
    assert.equal(a.seCruzan(filas[0], { tipo: "apvi", desde: "2026-06-01", hasta: null }), true)
    assert.equal(a.seCruzan(filas[0], { tipo: "apvc", desde: "2026-03-01", hasta: null }), false)
})

test("calcularAhorros: pesos, UF y porcentaje; rebaja del régimen B con tope de 50 UF", () => {
    const valores = { valorUF: 40000, rentaImponible: 1000000 }
    const filas = [
        { tipo: "apvi", institucion_codigo: "033", institucion_nombre: "AFP Capital", numero_contrato: "X1", forma_pago: 1, regimen: "B", modalidad: "uf", monto: "2.5" },
        { tipo: "apvc", institucion_codigo: "201", institucion_nombre: "Fondos", numero_contrato: null, forma_pago: 2, regimen: "B", modalidad: "porcentaje", monto: "3", aporte_empleador: "2" },
        { tipo: "deposito_convenido", institucion_codigo: "033", institucion_nombre: "AFP Capital", forma_pago: 1, regimen: null, modalidad: "pesos", monto: "150000" }
    ]
    const r = a.calcularAhorros(filas, valores)
    assert.equal(r.apvi.monto, 100000)
    assert.deepEqual([r.apvc.trabajador, r.apvc.empleador], [30000, 20000])
    assert.equal(r.depositoConvenido.monto, 150000)
    assert.equal(r.rebajaTributable, 130000)
    assert.equal(r.apvi.institucionCodigo, "033")

    const grande = a.calcularAhorros([{ ...filas[0], monto: "60" }], valores)
    assert.equal(grande.rebajaTributable, 50 * 40000)
    assert.equal(a.calcularAhorros([{ ...filas[0], regimen: "A" }], valores).rebajaTributable, 0)
    assert.deepEqual(a.calcularAhorros([], valores), { apvi: null, apvc: null, depositoConvenido: null, rebajaTributable: 0 })
})
