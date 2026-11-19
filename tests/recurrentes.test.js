const { test } = require("node:test")
const assert = require("node:assert/strict")
const { enMes, montoCuota, montoProporcional, saldoAlTermino, validarRecurrente } = require("../src/remuneraciones/recurrentes.js")

const colacion = { tipo: "permanente", monto: 60000, desde_mes: "2027-01-01", hasta_mes: "2027-06-01", proporcional: true, glosa: "Colación" }
const prestamo = { tipo: "cuotas", monto: 100000, cuotas: 3, desde_mes: "2027-01-01", glosa: "Préstamo marzo" }

test("permanente: rige desde su mes hasta el mes «hasta», inclusive", () => {
    assert.equal(enMes(colacion, 2026, 12), null)
    assert.deepEqual(enMes(colacion, 2027, 1), { monto: 60000, numeroCuota: null, proporcional: true, glosa: "Colación" })
    assert.equal(enMes(colacion, 2027, 6).monto, 60000)
    assert.equal(enMes(colacion, 2027, 7), null)
    // Sin «hasta»: todos los meses (hasta el término de la relación, que decide el servicio).
    assert.equal(enMes({ ...colacion, hasta_mes: null }, 2030, 5).monto, 60000)
})

test("cuotas: una por mes desde el primero; la última ajusta el redondeo", () => {
    assert.equal(montoCuota(100000, 3, 1), 33333)
    assert.equal(montoCuota(100000, 3, 3), 33334)
    assert.deepEqual(enMes(prestamo, 2027, 1), { monto: 33333, numeroCuota: 1, proporcional: false, glosa: "Préstamo marzo · cuota 1 de 3" })
    assert.equal(enMes(prestamo, 2027, 3).glosa, "Préstamo marzo · cuota 3 de 3")
    assert.equal(enMes(prestamo, 2027, 3).monto, 33334)
    assert.equal(enMes(prestamo, 2027, 4), null)
    assert.equal(enMes(prestamo, 2026, 12), null)
    assert.match(enMes({ ...prestamo, glosa: null }, 2027, 2).glosa, /^Préstamo · cuota 2 de 3$/)
})

test("permanente proporcional: sobre 30 días", () => {
    assert.equal(montoProporcional(60000, 30), 60000)
    assert.equal(montoProporcional(60000, 18), 36000)
    assert.equal(montoProporcional(60000, 31), 60000)
    assert.equal(montoProporcional(40000, 16), 21333)
})

test("saldo del préstamo al término: lo de los meses siguientes al término", () => {
    const cinco = { tipo: "cuotas", monto: 250000, cuotas: 5, desde_mes: "2027-01-01" }
    assert.deepEqual(saldoAlTermino(cinco, "2027-02-12"), { pagadas: 2, pendientes: 3, saldo: 150000 })
    assert.deepEqual(saldoAlTermino(cinco, "2027-06-30"), { pagadas: 5, pendientes: 0, saldo: 0 })
    assert.deepEqual(saldoAlTermino(cinco, "2026-12-31"), { pagadas: 0, pendientes: 5, saldo: 250000 })
    assert.deepEqual(saldoAlTermino(prestamo, "2027-02-10"), { pagadas: 2, pendientes: 1, saldo: 33334 })
})

test("validación de la definición", () => {
    assert.deepEqual(validarRecurrente({ tipo: "cuotas", monto: 150000, cuotas: 3, desde_mes: "2027-01", glosa: " Préstamo " }),
        { errores: [], datos: { tipo: "cuotas", monto: 150000, cuotas: 3, proporcional: false, desde_mes: "2027-01-01", hasta_mes: null, glosa: "Préstamo" } })
    assert.equal(validarRecurrente({ tipo: "permanente", monto: 60000, desde_mes: "2027-01", hasta_mes: "2027-12", proporcional: true }).datos.hasta_mes, "2027-12-01")
    assert.match(validarRecurrente({ tipo: "permanente", monto: 60000, desde_mes: "2027-05", hasta_mes: "2027-03" }).errores[0], /anterior/)
    assert.match(validarRecurrente({ tipo: "cuotas", monto: 100000, cuotas: 0, desde_mes: "2027-01" }).errores[0], /cuotas/)
    assert.match(validarRecurrente({ tipo: "permanente", monto: -5, desde_mes: "2027-01" }).errores[0], /mayor que 0/)
    assert.match(validarRecurrente({ tipo: "permanente", monto: 5, desde_mes: "enero" }).errores[0], /AAAA-MM/)
})
