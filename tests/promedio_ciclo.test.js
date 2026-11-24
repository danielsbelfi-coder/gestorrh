const test = require("node:test")
const assert = require("node:assert")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")
const { excesoPromedioAlTermino, semanasSobreMaximo } = require("../src/asistencia/promedio_ciclo.js")

// 22 bis, ciclo de 14 días desde el lunes 30-11-2026: semana 1 de 45 h (lunes a viernes 8:00 a 18:00, 60 min de
// colación) y semana 2 de 39 h (lunes a jueves 8:00 a 17:00 con 60 min, viernes 8:00 a 15:00 sin colación).
// Promedio pactado: 42 h semanales.
const DIAS = Array.from({ length: 14 }, (_, i) => {
    const dia = i + 1
    if (dia <= 5) return { dia, trabaja: true, entrada: "08:00", salida: "18:00", colacion: 60 }
    if (dia >= 8 && dia <= 11) return { dia, trabaja: true, entrada: "08:00", salida: "17:00", colacion: 60 }
    if (dia === 12) return { dia, trabaja: true, entrada: "08:00", salida: "15:00", colacion: 0 }
    return { dia, trabaja: false }
})
const TRAMOS = [{ desde: "0000-01-01", tipo: "promedio", ciclo_dias: 14, inicio_ciclo: "2026-11-30", dias: DIAS, jornada_id: 1 }]
const FERIADOS = [{ fecha: "2026-12-08", nombre: "Inmaculada Concepción" }, { fecha: "2026-12-25", nombre: "Navidad" }]

function diasDe(meses, { hasta, marcas = [], tramos = TRAMOS } = {}) {
    return meses.flatMap(([anio, mes]) => calcularLibro({ anio, mes, desde: "2026-11-01", hasta, tramosJornada: tramos, feriados: FERIADOS, marcas }).dias)
}
function calcular(fechaTermino, opciones = {}) {
    const meses = opciones.meses ?? [[2026, 12]]
    return excesoPromedioAlTermino({ dias: diasDe(meses, { ...opciones, hasta: fechaTermino }), tramos: opciones.tramos ?? TRAMOS, fechaTermino })
}

test("término al final de la semana pesada: 45 h trabajadas contra 42 h del promedio → 3 h", () => {
    const r = calcular("2026-12-20")
    assert.strictEqual(r.desde, "2026-12-14")
    assert.strictEqual(r.diasConsiderados, 7)
    assert.strictEqual(r.promedioSemanalHoras, 42)
    assert.strictEqual(r.minutosTrabajados, 45 * 60)
    assert.strictEqual(r.minutosPromedio, 42 * 60)
    assert.deepStrictEqual(r.porMes, { "2026-12": 180 })
})

test("término a mitad de la semana pesada: proporcional a los días (27 h contra 18 h → 9 h)", () => {
    const r = calcular("2026-12-16")
    assert.strictEqual(r.diasConsiderados, 3)
    assert.strictEqual(r.minutosExceso, 9 * 60)
})

test("ciclo completo: no hay nada que completar", () => {
    assert.strictEqual(calcular("2026-12-27"), null)
})

test("término en la semana liviana: se suma lo de las dos semanas (77 h en 11 días contra 66 h → 11 h)", () => {
    const r = calcular("2026-12-24")
    assert.strictEqual(r.minutosTrabajados, 77 * 60)
    assert.strictEqual(r.minutosPromedio, 66 * 60)
    assert.strictEqual(r.minutosExceso, 11 * 60)
})

test("una inasistencia no suma horas ni días: 36 h en 6 días contra 36 h → 0", () => {
    const marcas = [{ fecha: "2026-12-16", tipo: "inasistencia", estado_aprobacion: "aprobada" }]
    const r = calcular("2026-12-20", { marcas })
    assert.strictEqual(r.diasConsiderados, 6)
    assert.strictEqual(r.minutosExceso, 0)
})

test("las horas extra del día y los atrasos no cambian lo trabajado (ya se pagaron o descontaron aparte)", () => {
    const marcas = [
        { fecha: "2026-12-14", tipo: "normal", hora_entrada: "08:00", hora_salida: "20:00", estado_aprobacion: "aprobada" },
        { fecha: "2026-12-15", tipo: "atraso", hora_entrada: "09:00", hora_salida: "18:00", estado_aprobacion: "aprobada" }
    ]
    assert.strictEqual(calcular("2026-12-20", { marcas }).minutosExceso, 180)
})

test("ciclo entre dos meses: cada mes se queda con lo que excede en sus días", () => {
    // Desde el lunes 30-11: 4 días de 9 h (36 h) contra 42 × 4 / 7 = 24 h → 12 h; noviembre: 9 h contra 6 h = 3 h.
    const r = calcular("2026-12-03", { meses: [[2026, 11], [2026, 12]] })
    assert.strictEqual(r.desde, "2026-11-30")
    assert.strictEqual(r.minutosExceso, 12 * 60)
    assert.deepStrictEqual(r.porMes, { "2026-11": 180, "2026-12": 540 })
})

test("solo aplica a la jornada en promedio", () => {
    const semanal = [{ ...TRAMOS[0], tipo: "semanal", ciclo_dias: 7, inicio_ciclo: null, dias: DIAS.slice(0, 7) }]
    assert.strictEqual(calcular("2026-12-16", { tramos: semanal }), null)
})

test("art. 31: semana de 45 h con 8 h extra (53 h) supera las 52 h del 22 bis", () => {
    const marcas = ["2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17"].map((fecha) => ({ fecha, tipo: "normal", hora_entrada: "08:00", hora_salida: "20:00", estado_aprobacion: "aprobada" }))
    const dias = diasDe([[2026, 12]], { marcas })
    const avisos = semanasSobreMaximo({ dias, tramos: TRAMOS, desde: "2026-12-01", hasta: "2026-12-31" })
    assert.strictEqual(avisos.length, 1)
    assert.match(avisos[0], /Semana del 14-12 al 20-12: 53 h/)
    // Con 7 h extra (52 h) no avisa.
    const justo = diasDe([[2026, 12]], { marcas: marcas.slice(0, 3).concat([{ ...marcas[3], hora_salida: "19:00" }]) })
    assert.strictEqual(semanasSobreMaximo({ dias: justo, tramos: TRAMOS, desde: "2026-12-01", hasta: "2026-12-31" }).length, 0)
})
