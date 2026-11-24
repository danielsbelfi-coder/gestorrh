const test = require("node:test")
const assert = require("node:assert")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")
const { calcularSemanaCorrida } = require("../src/remuneraciones/semana_corrida.js")

// 7x7 de 8:00 a 20:00 con 60 min de colación (11 h), ciclo desde el lunes 28-12-2026: trabaja del 28-12 al 03-01.
// El viernes 01-01-2027 es feriado.
const DIAS = Array.from({ length: 14 }, (_, i) => i < 7
    ? { dia: i + 1, trabaja: true, entrada: "08:00", salida: "20:00", colacion: 60 }
    : { dia: i + 1, trabaja: false })
const tramo = (extra = {}) => [{ desde: "0000-01-01", tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-28", dias: DIAS, jornada_id: 1, festivos: "turno", festivo_compensacion: "descanso", ...extra }]
const FERIADOS = [{ fecha: "2027-01-01", nombre: "Año Nuevo" }]
const libro = (tramos, marcas = []) => calcularLibro({ anio: 2027, mes: 1, desde: "2026-01-01", tramosJornada: tramos, feriados: FERIADOS, marcas })
const dia = (r, fecha) => r.dias.find((d) => d.fecha === fecha)
const aprobada = (fecha, tipo, otros = {}) => ({ fecha, tipo, estado_aprobacion: "aprobada", ...otros })

test("festivo de turno: es día laboral con su horario y genera un día compensatorio", () => {
    const r = libro(tramo())
    assert.deepStrictEqual(dia(r, "2027-01-01").esperado, { tipo: "laboral", entrada: "08:00", salida: "20:00", colacion: 60, festivo: true, nombre: "Año Nuevo" })
    assert.strictEqual(dia(r, "2027-01-01").festivoPorCompensar, true)
    assert.strictEqual(r.totales.festivos_trabajados, 1)
    assert.strictEqual(r.totales.festivos_por_compensar, 1)
})

test("con «se descansan» el festivo sigue siendo feriado", () => {
    const r = libro(tramo({ festivos: "descanso" }))
    assert.strictEqual(dia(r, "2027-01-01").esperado.tipo, "feriado")
    assert.strictEqual(r.totales.festivos_trabajados, 0)
})

test("compensación «pago»: se suman las horas ordinarias del festivo (menos lo descontado)", () => {
    const r = libro(tramo({ festivo_compensacion: "pago" }), [aprobada("2027-01-01", "atraso", { hora_entrada: "08:30", hora_salida: "20:00" })])
    assert.strictEqual(r.totales.festivos_por_compensar, 0)
    assert.strictEqual(r.totales.minutos_festivo_pago, 11 * 60 - 30)
})

test("festivo libre aprobado: vuelve a ser feriado y no genera nada", () => {
    const r = libro(tramo(), [aprobada("2027-01-01", "festivo_libre")])
    assert.strictEqual(dia(r, "2027-01-01").esperado.tipo, "feriado")
    assert.strictEqual(dia(r, "2027-01-01").esperadoOriginal.festivo, true)
    assert.strictEqual(r.totales.festivos_trabajados, 0)
})

test("descanso compensatorio aprobado: el día de trabajo queda libre, sin descuento", () => {
    const r = libro(tramo(), [aprobada("2027-01-02", "descanso_compensatorio")])
    assert.deepStrictEqual(dia(r, "2027-01-02").esperado, { tipo: "libre", colacion: 60, compensatorio: true })
    assert.strictEqual(r.totales.dias_descanso_compensatorio, 1)
    assert.strictEqual(r.totales.dias_inasistencia, 0)
    // En un festivo o en un día libre no corresponde.
    const otro = libro(tramo(), [aprobada("2027-01-01", "descanso_compensatorio"), aprobada("2027-01-08", "festivo_libre")])
    assert.strictEqual(dia(otro, "2027-01-01").cuenta, false)
    assert.strictEqual(dia(otro, "2027-01-08").cuenta, false)
})

test("inasistencia en el festivo de turno: no se trabajó, no genera día compensatorio", () => {
    const r = libro(tramo(), [aprobada("2027-01-01", "inasistencia")])
    assert.strictEqual(r.totales.festivos_trabajados, 0)
    assert.strictEqual(r.totales.dias_inasistencia, 1)
})

test("contrato diario en un 7x7: el festivo trabajado se paga como día y la semana corrida lo sigue contando", () => {
    const r = libro(tramo())
    const sc = calcularSemanaCorrida({ sistema: "diario", dias: r.dias, tramos: [{ desde: "0000-01-01", sueldo: 40000 }], resumen: {}, porCiclo: true })
    assert.ok(sc.fechas.includes("2027-01-01"))
    // Enero: días 1-3, 11-17 y 25-31 de trabajo (17), el 01-01 incluido.
    assert.strictEqual(sc.divisor, 17)
})
