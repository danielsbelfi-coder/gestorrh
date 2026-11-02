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

test("feriadoFiniquito: pendientes + proporcional e inhábiles desde el día siguiente al término", () => {
    // Término el viernes 6-11-2026: 3 hábiles → lunes 9, martes 10 y miércoles 11; inhábiles: sábado 7 y domingo 8.
    const r = v.feriadoFiniquito({ saldo: { disponible: 1, enCurso: { proporcional: 2 } }, fechaTermino: "2026-11-06" })
    assert.deepEqual([r.habiles, r.inhabiles, r.diasPorPagar], [3, 2, 5])
    // Con fracción (2,5): se recorre hasta el tercer hábil; un feriado en el camino se suma.
    const f = v.feriadoFiniquito({ saldo: { disponible: 0, enCurso: { proporcional: 2.5 } }, fechaTermino: "2026-11-06", feriados: ["2026-11-10"] })
    assert.deepEqual([f.habiles, f.inhabiles, f.diasPorPagar], [2.5, 3, 5.5])
    // Los inhábiles después del último hábil no se suman (término el miércoles, 2 hábiles: jueves y viernes).
    assert.equal(v.feriadoFiniquito({ saldo: { disponible: 2, enCurso: null }, fechaTermino: "2026-11-04" }).inhabiles, 0)
})

test("feriadoFiniquito: art. 44 sin proporcional y anticipadas como exceso", () => {
    const a = v.feriadoFiniquito({ saldo: { disponible: 0, enCurso: { proporcional: 1.25 } }, fechaTermino: "2026-11-06", art44: true })
    assert.deepEqual([a.proporcional, a.diasPorPagar, a.art44], [0, 0, true])
    const n = v.feriadoFiniquito({ saldo: { disponible: -5, enCurso: { proporcional: 2 } }, fechaTermino: "2026-11-06" })
    assert.deepEqual([n.habiles, n.diasPorPagar, n.anticipados, n.pendientes], [0, 0, 3, 0])
})

test("art. 71: días corridos de vacaciones en el mes (tope 30)", () => {
    assert.equal(v.diasCorridosEnMes([{ desde: "2026-11-23", hasta: "2026-12-04" }], 2026, 11), 8)
    assert.equal(v.diasCorridosEnMes([{ desde: "2026-11-23", hasta: "2026-12-04" }], 2026, 12), 4)
    assert.equal(v.diasCorridosEnMes([{ desde: "2026-12-01", hasta: "2026-12-31" }], 2026, 12), 30)
    assert.equal(v.diasCorridosEnMes([{ desde: "2026-10-01", hasta: "2026-10-05" }], 2026, 11), 0)
})

test("art. 71: promedio de comisiones, tratos y bonos variables de los últimos 3 meses / 30 × días", () => {
    const meses = [{ 2103: 300000, 2102: 99999 }, { 2112: 150000, 2113: 60000 }, { 2103: 90000 }, { 2103: 1000000 }]
    assert.deepEqual(v.remuneracionVariableVacaciones(meses, 12), { promedio: 200000, dias: 12, monto: 80000, meses: 3 })
    assert.deepEqual(v.remuneracionVariableVacaciones([], 10), { promedio: 0, dias: 10, monto: 0, meses: 0 })
})
