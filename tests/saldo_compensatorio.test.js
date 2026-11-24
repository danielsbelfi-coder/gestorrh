const test = require("node:test")
const assert = require("node:assert")
const { saldoAl, resumenEntre, disponibleEn } = require("../src/asistencia/saldo_compensatorio.js")

// Diciembre: 60 min el 10 y 90 min el 20; enero: 30 min el 5. Descansos: 45 min el 22-12 y 60 min el 15-01.
const GANADOS = [{ fecha: "2026-12-10", minutos: 60 }, { fecha: "2026-12-20", minutos: 90 }, { fecha: "2027-01-05", minutos: 30 }]
const USADOS = [{ fecha: "2026-12-22", minutos: 45 }, { fecha: "2027-01-15", minutos: 60 }]

test("el saldo pasa de un mes a otro: diciembre cierra con 105 min y enero con 75", () => {
    assert.deepStrictEqual(resumenEntre({ ganados: GANADOS, usados: USADOS, desde: "2026-12-01", hasta: "2026-12-31" }),
        { saldoInicial: 0, ganado: 150, usado: 45, saldoFinal: 105 })
    assert.deepStrictEqual(resumenEntre({ ganados: GANADOS, usados: USADOS, desde: "2027-01-01", hasta: "2027-01-31" }),
        { saldoInicial: 105, ganado: 30, usado: 60, saldoFinal: 75 })
})

test("saldo a una fecha (incluida)", () => {
    assert.strictEqual(saldoAl({ ganados: GANADOS, usados: USADOS, fecha: "2026-12-20" }), 150)
    assert.strictEqual(saldoAl({ ganados: GANADOS, usados: USADOS, fecha: "2026-12-22" }), 105)
})

test("disponible para un descanso: lo ganado hasta esa fecha menos todo lo comprometido, aunque sea posterior", () => {
    // Al 12-12 solo se habían ganado 60 min, y ya hay 105 comprometidos.
    assert.strictEqual(disponibleEn({ ganados: GANADOS, comprometidos: USADOS, fecha: "2026-12-12" }), -45)
    assert.strictEqual(disponibleEn({ ganados: GANADOS, comprometidos: USADOS, fecha: "2027-01-20" }), 75)
})
