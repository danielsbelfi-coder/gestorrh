const test = require("node:test")
const assert = require("node:assert")
const { fechaChilena, tramosContinuos, fechaISO, fechaEnTexto } = require("../src/shared/fechas.js")

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
test("fechaISO: texto, texto con hora y Date (a la fecha de Chile)", () => {
    assert.strictEqual(fechaISO("2026-11-16"), "2026-11-16")
    assert.strictEqual(fechaISO("2026-11-16T15:00:00Z"), "2026-11-16")
    assert.strictEqual(fechaISO(new Date("2026-11-16T15:00:00Z")), "2026-11-16")
    assert.strictEqual(fechaISO(new Date("2026-11-17T01:30:00Z")), "2026-11-16")
    assert.strictEqual(fechaISO(null), "")
})

test("fechaEnTexto acepta un Date sin dejar «undefined»", () => {
    assert.strictEqual(fechaEnTexto("2026-02-01"), "1 de febrero de 2026")
    assert.strictEqual(fechaEnTexto(new Date("2026-11-16T15:00:00Z")), "16 de noviembre de 2026")
})
