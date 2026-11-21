const test = require("node:test")
const assert = require("node:assert/strict")
const { calcularTurno, resumenTurnos, topeDelMes, valorizarPausa } = require("../src/asistencia/calculo_turnos.js")

// Tipos de espera de prueba (paquete V).
const TERMINAL = { id: 1, nombre: "Espera en terminal", clase: "terminal", imputable: false, pago: "por_hora", valor: 5000, minutos_sin_pago: 120, redondeo_minutos: 30, compensacion: "dinero" }
const BORDO = { id: 2, nombre: "Descanso a bordo", clase: "descanso_bordo", imputable: false, pago: "no", valor: 0, minutos_sin_pago: 0, redondeo_minutos: 1, compensacion: "dinero" }
const ADUANA = { id: 3, nombre: "Aduana", clase: "aduana", imputable: true, pago: "no", valor: 0, minutos_sin_pago: 0, redondeo_minutos: 1, compensacion: "dinero" }
const TIERRA = { id: 4, nombre: "Descanso en tierra", clase: "descanso_tierra", imputable: false, pago: "no", valor: 0, minutos_sin_pago: 0, redondeo_minutos: 1, compensacion: "dinero" }
const COMPENSA = { id: 5, nombre: "Retraso compensado", clase: "retraso_operativo", imputable: false, pago: "por_hora", valor: 4000, minutos_sin_pago: 0, redondeo_minutos: 15, compensacion: "descanso" }
const FIJO = { id: 6, nombre: "Cruce", clase: "cruce", imputable: false, pago: "monto_fijo", valor: 8000, minutos_sin_pago: 30, redondeo_minutos: 1, compensacion: "dinero" }
const TIPOS = new Map([TERMINAL, BORDO, ADUANA, TIERRA, COMPENSA, FIJO].map((t) => [t.id, t]))

test("valorizar una espera: horas sin pago, redondeo hacia arriba, monto fijo y compensación en descanso", () => {
    // 3 h de terminal: las primeras 2 sin pago; 60 min × $5.000 = $5.000.
    assert.deepEqual(valorizarPausa(180, TERMINAL), { pagables: 60, monto: 5000, compensatorios: 0 })
    // 2 h 10 min: 10 min pagables, redondeados a 30 → $2.500.
    assert.deepEqual(valorizarPausa(130, TERMINAL), { pagables: 30, monto: 2500, compensatorios: 0 })
    assert.deepEqual(valorizarPausa(90, TERMINAL), { pagables: 0, monto: 0, compensatorios: 0 })
    assert.deepEqual(valorizarPausa(40, FIJO), { pagables: 10, monto: 8000, compensatorios: 0 })
    assert.deepEqual(valorizarPausa(20, FIJO), { pagables: 0, monto: 0, compensatorios: 0 })
    assert.deepEqual(valorizarPausa(50, COMPENSA), { pagables: 0, monto: 0, compensatorios: 60 })
    assert.deepEqual(valorizarPausa(300, ADUANA), { pagables: 0, monto: 0, compensatorios: 0 })
})

test("turno con esperas: la no imputable sale de la jornada y la imputable no", () => {
    // 06:00 a 18:00 (12 h); aduana 08:00–09:00 (jornada); terminal 11:00–14:00 (no imputable, $5.000).
    const c = calcularTurno({ hora_inicio: "06:00", hora_fin: "18:00", pausas: [
        { tipo_espera_id: 3, inicio: "08:00", fin: "09:00" },
        { tipo_espera_id: 1, inicio: "11:00", fin: "14:00", lugar: "Terminal Chillán" }
    ] }, TIPOS)
    assert.deepEqual(c.errores, [])
    assert.deepEqual([c.minutosTotales, c.minutosNoImputables, c.minutosJornada, c.monto], [720, 180, 540, 5000])
    // Conducción continua: 06–08 (2 h) + 09–11 (2 h) = 4 h hasta la espera de 3 h, luego 14–18 = 4 h. Sin alerta.
    assert.deepEqual(c.alertas, [])
})

test("alerta de más de 5 horas de conducción continua; una pausa corta no reinicia la cuenta", () => {
    const c = calcularTurno({ hora_inicio: "07:00", hora_fin: "14:00", pausas: [{ tipo_espera_id: 2, inicio: "10:00", fin: "10:30" }] }, TIPOS)
    assert.match(c.alertas.join(), /6 h 30 min de conducción continua/)
    const conDescanso = calcularTurno({ hora_inicio: "07:00", hora_fin: "16:00", pausas: [{ tipo_espera_id: 4, inicio: "11:00", fin: "13:00" }] }, TIPOS)
    assert.deepEqual(conDescanso.alertas, [])
})

test("turno que cruza la medianoche y pausas después de las 00:00", () => {
    // Nocturno 22:00 a 08:00 con descanso a bordo de 02:00 a 04:00: 10 h − 2 h = 8 h de jornada.
    const c = calcularTurno({ hora_inicio: "22:00", hora_fin: "08:00", pausas: [{ tipo_espera_id: 2, inicio: "02:00", fin: "04:00" }] }, TIPOS)
    assert.deepEqual(c.errores, [])
    assert.deepEqual([c.inicio, c.fin, c.minutosJornada], [1320, 1920, 480])
    assert.deepEqual(c.alertas, [])
})

test("errores: pausa fuera del turno, superpuestas, sin tipo y misma hora", () => {
    assert.match(calcularTurno({ hora_inicio: "08:00", hora_fin: "12:00", pausas: [{ tipo_espera_id: 1, inicio: "11:00", fin: "13:00" }] }, TIPOS).errores.join(), /dentro del turno/)
    assert.match(calcularTurno({ hora_inicio: "08:00", hora_fin: "18:00", pausas: [{ tipo_espera_id: 1, inicio: "10:00", fin: "12:00" }, { tipo_espera_id: 2, inicio: "11:00", fin: "13:00" }] }, TIPOS).errores.join(), /se superponen/)
    assert.match(calcularTurno({ hora_inicio: "08:00", hora_fin: "18:00", pausas: [{ tipo_espera_id: 99, inicio: "10:00", fin: "11:00" }] }, TIPOS).errores.join(), /tipo de espera/)
    assert.match(calcularTurno({ hora_inicio: "08:00", hora_fin: "08:00", pausas: [] }, TIPOS).errores.join(), /misma hora/)
})

test("turno de más de 16 horas sin un descanso de 8 horas", () => {
    const c = calcularTurno({ hora_inicio: "05:00", hora_fin: "23:00", pausas: [{ tipo_espera_id: 4, inicio: "10:00", fin: "12:00" }, { tipo_espera_id: 4, inicio: "16:00", fin: "18:00" }] }, TIPOS)
    assert.match(c.alertas.join(), /18 h sin un descanso de 8 horas/)
})

test("resumen del mes: descanso entre turnos, solo aprobados, tope y horas sobre el tope", () => {
    const turnos = [
        { id: 1, fecha: "2027-03-01", hora_inicio: "06:00", hora_fin: "18:00", estado_aprobacion: "aprobado", pausas: [{ tipo_espera_id: 1, inicio: "11:00", fin: "14:00" }] },
        // Empieza a las 00:00 del 02: solo 6 h desde las 18:00 del 01.
        { id: 2, fecha: "2027-03-02", hora_inicio: "00:00", hora_fin: "08:00", estado_aprobacion: "aprobado", pausas: [{ tipo_espera_id: 2, inicio: "03:00", fin: "05:00" }] },
        { id: 3, fecha: "2027-03-03", hora_inicio: "08:00", hora_fin: "12:00", estado_aprobacion: "pendiente", pausas: [] }
    ]
    const { filas, resumen } = resumenTurnos({ turnos, tipos: TIPOS, topeHoras: 10 })
    assert.match(filas[1].calculo.alertas.join(), /Solo 6 h de descanso/)
    assert.match(filas[1].calculo.alertas.join(), /8 horas de descanso en tierra/)
    // Aprobados: 9 h + 6 h = 15 h; tope 10 h → 5 h sobre el tope. El pendiente no suma.
    assert.deepEqual([resumen.aprobados, resumen.pendientes, resumen.minutosJornada, resumen.minutosSobreTope, resumen.montoEsperas], [2, 1, 900, 300, 5000])
    assert.deepEqual(resumen.esperas.map((e) => [e.tipo, e.cantidad, e.minutos, e.monto]), [["Espera en terminal", 1, 180, 5000], ["Descanso a bordo", 1, 120, 0]])
    assert.equal(topeDelMes(180, 30), 180)
    assert.equal(topeDelMes(180, 16), 96)
    assert.equal(topeDelMes(180, 13), 78)
})
