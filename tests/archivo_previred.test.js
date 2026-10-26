const test = require("node:test")
const assert = require("node:assert")
const { tramoAsignacionFamiliar } = require("../src/remuneraciones/archivo_previred.js")

const limites = { a: 649039, b: 947990, c: 1478539 }

test("tramo de asignación familiar según la renta, con los límites incluidos", () => {
    assert.strictEqual(tramoAsignacionFamiliar(500000, limites), "A")
    assert.strictEqual(tramoAsignacionFamiliar(649039, limites), "A")
    assert.strictEqual(tramoAsignacionFamiliar(649040, limites), "B")
    assert.strictEqual(tramoAsignacionFamiliar(1072299, limites), "C")
    assert.strictEqual(tramoAsignacionFamiliar(1478539, limites), "C")
    assert.strictEqual(tramoAsignacionFamiliar(1478540, limites), "D")
})