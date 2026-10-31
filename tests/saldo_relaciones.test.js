const test = require("node:test")
const assert = require("node:assert/strict")
const { saldoPendiente } = require("../src/remuneraciones/saldo_relaciones.js")

test("saldoPendiente: no recuperado de finiquitos abiertos menos lo ya descontado", () => {
    assert.equal(saldoPendiente([{ no_recuperado: 300000, cerrado: null }], 0), 300000)
    assert.equal(saldoPendiente([{ no_recuperado: 300000, cerrado: null }], 120000), 180000)
    assert.equal(saldoPendiente([{ no_recuperado: 300000, cerrado: null }, { no_recuperado: 50000, cerrado: { motivo: "x" } }], 0), 300000)
    assert.equal(saldoPendiente([{ no_recuperado: 100000, cerrado: null }], 150000), 0)
    assert.equal(saldoPendiente([], 0), 0)
})
