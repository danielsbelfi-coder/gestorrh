const test = require("node:test")
const assert = require("node:assert")
const { fechaChilena, tramosContinuos } = require("../src/shared/fechas.js")

test("fechaChilena convierte a día-mes-año", () => {
    assert.strictEqual(fechaChilena("2025-03-01"), "01-03-2025")
    assert.strictEqual(fechaChilena("2026-10-26T12:42:48.913Z"), "26-10-2026")
    assert.strictEqual(fechaChilena(null), "")
})

test("tramosContinuos agrupa días seguidos y separa los sueltos", () => {
    assert.deepStrictEqual(tramosContinuos([]), [])
    assert.deepStrictEqual(tramosContinuos(["2027-07-05"]), [{ desde: "2027-07-05", hasta: "2027-07-05" }])
    assert.deepStrictEqual(tramosContinuos(["2027-07-07", "2027-07-05", "2027-07-06"]), [{ desde: "2027-07-05", hasta: "2027-07-07" }])
    assert.deepStrictEqual(tramosContinuos(["2027-07-02", "2027-07-05"]), [
        { desde: "2027-07-02", hasta: "2027-07-02" },
        { desde: "2027-07-05", hasta: "2027-07-05" }
    ])
    assert.deepStrictEqual(tramosContinuos(["2027-06-30", "2027-07-01"]), [{ desde: "2027-06-30", hasta: "2027-07-01" }])
})