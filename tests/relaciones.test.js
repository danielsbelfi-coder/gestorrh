const test = require("node:test")
const assert = require("node:assert/strict")
const { relacionQueSeCruza, mensajeCruce } = require("../src/trabajadores/relaciones.js")

const otras = [{ id: 1, fecha_ingreso: "2026-11-02", fecha_termino: "2026-11-15" }]

test("relacionQueSeCruza: una recontratación empieza después del término de la anterior", () => {
    assert.equal(relacionQueSeCruza(otras, "2026-11-16", null), null)
    assert.equal(relacionQueSeCruza(otras, "2026-11-15", null)?.id, 1)
    assert.equal(relacionQueSeCruza(otras, "2026-11-02", null)?.id, 1)
    assert.equal(relacionQueSeCruza(otras, "2026-10-01", "2026-11-01"), null)
    assert.equal(relacionQueSeCruza(otras, "2026-10-01", "2026-11-05")?.id, 1)
})

test("relacionQueSeCruza: una relación sin término se cruza con todo lo posterior", () => {
    const abiertas = [{ id: 2, fecha_ingreso: "2026-11-16", fecha_termino: null }]
    assert.equal(relacionQueSeCruza(abiertas, "2027-05-01", null)?.id, 2)
    assert.equal(relacionQueSeCruza(abiertas, "2026-10-01", "2026-11-15"), null)
})

test("mensajeCruce: fechas en formato chileno", () => {
    assert.match(mensajeCruce(otras[0]), /desde el 02-11-2026 hasta el 15-11-2026/)
    assert.match(mensajeCruce({ fecha_ingreso: "2026-11-16", fecha_termino: null }), /sin término/)
})
