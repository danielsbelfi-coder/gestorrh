const test = require("node:test")
const assert = require("node:assert/strict")
const { armarNomina } = require("../src/remuneraciones/nomina_bancaria.js")

const persona = (extra) => ({ rut: "12345678", dv: "k", nombres: "Ana", apellido_paterno: "Soto", forma_pago: "transferencia", banco_codigo: "012", tipo_cuenta: "cuenta Rut", numero_cuenta: " 12345678 ", email: "a@b.cl", ...extra })

test("armarNomina: filas con datos completos y excluidas con motivo", () => {
    const r = armarNomina([
        { trabajador_id: 1, persona: persona(), monto: 500000.4, glosa: "Remuneración noviembre 2026" },
        { trabajador_id: 2, persona: persona({ nombres: "Beto", forma_pago: "efectivo" }), monto: 300000, glosa: "x" },
        { trabajador_id: 3, persona: persona({ nombres: "Carla", banco_codigo: null }), monto: 300000, glosa: "x" },
        { trabajador_id: 4, persona: persona({ nombres: "Dani" }), monto: 0, glosa: "x" },
        { trabajador_id: 5, persona: persona({ nombres: "Eva" }), monto: 100, glosa: "x", motivo: "Liquidación en borrador" }
    ])
    assert.equal(r.filas.length, 1)
    assert.deepEqual(r.filas[0], { trabajador_id: 1, rut: "12345678-K", nombre: "Ana Soto", monto: 500000, banco_codigo: "012", banco: "BancoEstado", tipo_cuenta: "cuenta Rut", numero_cuenta: "12345678", email: "a@b.cl", glosa: "Remuneración noviembre 2026" })
    assert.equal(r.total, 500000)
    assert.deepEqual(r.excluidas.map((e) => [e.nombre, e.motivo]), [
        ["Beto Soto", "Forma de pago: efectivo"], ["Carla Soto", "Faltan datos bancarios: banco"], ["Dani Soto", "Monto en $0"], ["Eva Soto", "Liquidación en borrador"]
    ])
})
