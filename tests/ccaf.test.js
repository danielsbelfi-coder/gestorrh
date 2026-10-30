const test = require("node:test")
const assert = require("node:assert/strict")
const c = require("../src/remuneraciones/ccaf.js")

test("saludParaCcaf: 4,2 % de la base para Fonasa con caja; nada con isapre o sin caja", () => {
    const base = { caja: "los_andes", sistemaSalud: "Fonasa", baseCotizaciones: 1000000, saludLegal: 70000, tasa: 4.2 }
    assert.equal(c.saludParaCcaf(base), 42000)
    assert.equal(c.saludParaCcaf({ ...base, sistemaSalud: "Isapre" }), 0)
    assert.equal(c.saludParaCcaf({ ...base, caja: null }), 0)
    assert.equal(c.saludParaCcaf({ ...base, saludLegal: 30000 }), 30000)
})

test("problemasDescuentosCcaf: sin caja y descuentos que la caja no recibe", () => {
    assert.deepEqual(c.problemasDescuentosCcaf("los_heroes", { CCAF_DENTAL: 5000, CCAF_OTROS: 1000 }), [])
    assert.equal(c.problemasDescuentosCcaf("los_andes", { CCAF_DENTAL: 5000, CCAF_CREDITO_PERSONAL: 20000 }).length, 1)
    assert.equal(c.problemasDescuentosCcaf("la_araucana", { CCAF_SEGURO_VIDA: 3000 }).length, 1)
    assert.match(c.problemasDescuentosCcaf(null, { CCAF_CREDITO_PERSONAL: 20000 })[0], /no tenía caja/)
    assert.deepEqual(c.problemasDescuentosCcaf(null, {}), [])
})

test("códigos de las cajas en Previred y el LRE", () => {
    assert.deepEqual(Object.values(c.CODIGO_PREVIRED), ["01", "02", "03", "06"])
    assert.deepEqual(Object.values(c.CODIGO_LRE), [1, 2, 3, 4])
})
