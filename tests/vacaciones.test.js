const test = require("node:test")
const assert = require("node:assert/strict")
const v = require("../src/asistencia/vacaciones.js")

test("diasHabiles: lunes a viernes sin feriados (el sábado es inhábil, art. 69)", () => {
    // Lunes 2 al domingo 15 de noviembre de 2026: 10 días de lunes a viernes.
    assert.equal(v.diasHabiles("2026-11-02", "2026-11-15"), 10)
    assert.equal(v.diasHabiles("2026-11-02", "2026-11-15", ["2026-11-02"]), 9)
    assert.deepEqual(v.fechasHabiles("2026-11-06", "2026-11-09"), ["2026-11-06", "2026-11-09"])
    assert.equal(v.diasHabiles("2026-11-07", "2026-11-08"), 0)
})

test("periodosAnuales y sumarAnios (29 de febrero)", () => {
    assert.deepEqual(v.periodosAnuales("2024-03-15", "2026-03-15").map((p) => [p.numero, p.desde, p.hasta]),
        [[1, "2024-03-15", "2025-03-14"], [2, "2025-03-15", "2026-03-14"], [3, "2026-03-15", "2027-03-14"]])
    assert.equal(v.sumarAnios("2024-02-29", 1), "2025-02-28")
})

test("saldoVacaciones: períodos cumplidos, imputación al más antiguo y proporcional en curso", () => {
    const s = v.saldoVacaciones({
        fechaIngreso: "2023-01-01", hoy: "2025-06-30",
        tomadas: [{ id: 1, desde: "2024-02-01", dias: 10 }, { id: 2, desde: "2025-02-01", dias: 8 }]
    })
    const anuales = s.periodos.map((p) => [p.numero, p.ganados, p.tomados, p.pendientes, p.cumplido])
    assert.deepEqual(anuales, [[1, 15, 15, 0, true], [2, 15, 3, 12, true], [3, 0, 0, 0, false]])
    assert.deepEqual([s.ganados, s.tomados, s.disponible, s.anticipados], [30, 18, 12, 0])
    assert.equal(s.enCurso.numero, 3)
    assert.equal(s.enCurso.proporcional, 7.5)
    assert.deepEqual(s.avisos, [])
})

test("saldoVacaciones: anticipadas, más de dos períodos acumulados y período sin bloque de 10 días", () => {
    const anticipada = v.saldoVacaciones({ fechaIngreso: "2026-01-05", hoy: "2026-08-01", tomadas: [{ id: 1, desde: "2026-07-01", dias: 5 }] })
    assert.deepEqual([anticipada.disponible, anticipada.anticipados], [-5, 5])
    assert.match(anticipada.avisos.join(" "), /anticipadas/)

    const acumulado = v.saldoVacaciones({ fechaIngreso: "2020-01-01", hoy: "2023-06-01", tomadas: [] })
    assert.match(acumulado.avisos.join(" "), /Acumula 3 períodos/)

    const fraccionado = v.saldoVacaciones({ fechaIngreso: "2024-01-01", hoy: "2025-12-01", tomadas: [
        { id: 1, desde: "2025-02-01", dias: 5 }, { id: 2, desde: "2025-04-01", dias: 5 }, { id: 3, desde: "2025-06-01", dias: 5 }
    ] })
    assert.match(fraccionado.avisos.join(" "), /período 1 se usó sin un bloque de al menos 10/)
})

test("saldoVacaciones: saldo inicial a una fecha de corte reemplaza los períodos anteriores", () => {
    const s = v.saldoVacaciones({
        fechaIngreso: "2018-05-10", hoy: "2026-11-01",
        saldoInicial: { fecha_corte: "2026-03-31", dias: 22.5 },
        tomadas: [{ id: 1, desde: "2026-06-01", dias: 10 }]
    })
    assert.deepEqual(s.periodos.map((p) => [p.tipo, p.ganados, p.tomados, p.pendientes]),
        [["inicial", 22.5, 10, 12.5], ["anual", 15, 0, 15], ["anual", 0, 0, 0]])
    assert.equal(s.disponible, 27.5)
})

test("saldoVacaciones: con término, se calcula a la fecha del término", () => {
    const s = v.saldoVacaciones({ fechaIngreso: "2025-01-01", fechaTermino: "2026-06-30", hoy: "2026-11-01", tomadas: [] })
    assert.equal(s.referencia, "2026-06-30")
    assert.equal(s.ganados, 15)
    assert.equal(s.enCurso.proporcional, 7.5)
})

test("diasProgresivos (art. 68): 10 años trabajados y 1 día por cada 3 nuevos; anteriores hasta 10", () => {
    assert.equal(v.diasProgresivos(10, 2), 0)
    assert.equal(v.diasProgresivos(10, 3), 1)
    assert.equal(v.diasProgresivos(10, 6), 2)
    assert.equal(v.diasProgresivos(15, 3), 1)
    assert.equal(v.diasProgresivos(5, 7), 0)
    assert.equal(v.diasProgresivos(5, 8), 1)
    assert.equal(v.diasProgresivos(0, 13), 1)
    assert.equal(v.diasProgresivos(null, 12), 0)
})

test("saldoVacaciones con progresivo: el período que cumple los 3 años suma el día y el proporcional lo incluye", () => {
    const s = v.saldoVacaciones({ fechaIngreso: "2020-01-01", hoy: "2023-06-30", aniosPrevios: 10, tomadas: [] })
    assert.deepEqual(s.periodos.filter((p) => p.cumplido).map((p) => [p.numero, p.progresivos, p.ganados]), [[1, 0, 15], [2, 0, 15], [3, 1, 16]])
    assert.equal(s.ganados, 46)
    assert.equal(s.enCurso.progresivos, 1)
    assert.equal(s.enCurso.proporcional, 8)
    assert.equal(s.aniosPrevios, 10)
})
