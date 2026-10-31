const test = require("node:test")
const assert = require("node:assert/strict")
const { revisarArt58 } = require("../src/remuneraciones/art58.js")

const linea = (tipo, monto, limite_art58 = false) => ({ concepto: { tipo, limite_art58 }, monto })

test("revisarArt58: suma solo los descuentos marcados y compara con el 15 % de los haberes imponibles", () => {
    const lineas = [linea("haber", 1000000), linea("descuento", 100000, true), linea("descuento", 80000, true), linea("descuento", 500000), linea("haber", 50000, true)]
    assert.deepEqual(revisarArt58(lineas, 1000000), { base: 1000000, tope: 150000, voluntarios: 180000, exceso: 30000 })
    assert.equal(revisarArt58(lineas, 2000000).exceso, 0)
    assert.deepEqual(revisarArt58([], -5), { base: 0, tope: 0, voluntarios: 0, exceso: 0 })
})
