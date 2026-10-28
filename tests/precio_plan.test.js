const { test } = require("node:test")
const assert = require("node:assert")
const { calcularPrecio } = require("../src/cuentas/precio_plan.js")

const plan = { precio_uf: "1.8000", precio_usuario_adicional_uf: "0.1500" }

test("plan sin usuarios adicionales: neto, IVA y total en UF y pesos", () => {
    const precio = calcularPrecio({ plan, usuariosAdicionales: 0, valorUF: 39600 })
    assert.strictEqual(precio.neto_uf, 1.8)
    assert.strictEqual(precio.iva_uf, 0.342)
    assert.strictEqual(precio.total_uf, 2.142)
    assert.strictEqual(precio.total_pesos, 84823)
})

test("suma los usuarios adicionales", () => {
    const precio = calcularPrecio({ plan, usuariosAdicionales: 3, valorUF: null })
    assert.strictEqual(precio.adicionales_uf, 0.45)
    assert.strictEqual(precio.neto_uf, 2.25)
    assert.strictEqual(precio.total_pesos, null)
})
