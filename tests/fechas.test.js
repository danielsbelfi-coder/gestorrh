const test = require("node:test")
const assert = require("node:assert")
const { fechaChilena } = require("../src/shared/fechas.js")

test("fechaChilena convierte a día-mes-año", () => {
    assert.strictEqual(fechaChilena("2025-03-01"), "01-03-2025")
    assert.strictEqual(fechaChilena("2026-10-26T12:42:48.913Z"), "26-10-2026")
    assert.strictEqual(fechaChilena(null), "")
})