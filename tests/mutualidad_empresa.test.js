const test = require("node:test")
const assert = require("node:assert/strict")
const { mutualidadParaArchivos } = require("../src/remuneraciones/mutualidad_empresa.js")

const isl = { codigo: "ISL", codigo_previred: "00", codigo_lre: 0 }

test("empresa con mutualidad usa la suya", async () => {
    const achs = { codigo: "ACHS", codigo_previred: "01", codigo_lre: 1 }
    const r = await mutualidadParaArchivos({ Mutualidad: achs }, async () => assert.fail("no debe buscar el ISL"))
    assert.equal(r, achs)
})

test("empresa sin mutualidad cotiza en el ISL", async () => {
    assert.equal(await mutualidadParaArchivos({ Mutualidad: null }, async () => isl), isl)
    assert.equal(await mutualidadParaArchivos({}, async () => isl), isl)
})
