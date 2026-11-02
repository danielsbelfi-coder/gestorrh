const test = require("node:test")
const assert = require("node:assert/strict")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")
const sc = require("../src/remuneraciones/semana_corrida.js")

// Noviembre de 2026: empieza en domingo (domingos 1, 8, 15, 22 y 29); lunes a viernes = 21 días.
// Con un festivo de prueba el viernes 13: 20 días laborales y 6 de descanso (5 domingos + el festivo).
const LUNES_A_VIERNES = Array.from({ length: 7 }, (_, i) => ({ dia: i + 1, trabaja: i < 5, entrada: "09:00", salida: "18:00", colacion: 60 }))
const FERIADOS = [{ fecha: "2026-11-13", nombre: "Festivo de prueba" }]
const SIN_AUSENCIAS = { dias_inasistencia: 0, dias_permiso_sin_goce: 0, dias_vacaciones: 0 }
const marca = (fecha, tipo) => ({ fecha, tipo, estado_aprobacion: "aprobada" })

function libro({ marcas = [], licencias = [], plantilla = LUNES_A_VIERNES, desde = "2026-01-01" } = {}) {
    return calcularLibro({ anio: 2026, mes: 11, desde, tramosJornada: [{ desde: "0000-01-01", dias: plantilla }], feriados: FERIADOS, licencias, marcas }).dias
}

test("contrato diario sin ausencias: 20 días pagados y semana corrida = promedio diario × 6 días de descanso", () => {
    const dias = libro()
    const tramos = [{ desdeDia: 1, sueldo: 30000 }]
    assert.deepEqual(sc.sueldoPorDias({ sistema: "diario", dias, tramos, resumen: SIN_AUSENCIAS }), { sistema: "diario", cantidad: 20, monto: 600000 })
    const s = sc.calcularSemanaCorrida({ sistema: "diario", dias, tramos, resumen: SIN_AUSENCIAS })
    assert.deepEqual([s.base, s.divisor, s.dias, s.monto], [600000, 20, 6, 180000])
    assert.ok(s.fechas.includes("2026-11-13") && s.fechas.includes("2026-11-01"))
})

test("inasistencia: no se paga el día, baja la base pero queda en el divisor (no hace perder el derecho)", () => {
    const dias = libro({ marcas: [marca("2026-11-04", "inasistencia")] })
    const tramos = [{ desdeDia: 1, sueldo: 30000 }]
    const resumen = { ...SIN_AUSENCIAS, dias_inasistencia: 1 }
    assert.equal(sc.sueldoPorDias({ sistema: "diario", dias, tramos, resumen }).monto, 570000)
    const s = sc.calcularSemanaCorrida({ sistema: "diario", dias, tramos, resumen })
    assert.deepEqual([s.base, s.divisor, s.dias, s.monto], [570000, 20, 6, 171000])
})

test("una semana completa de vacaciones: se pagan los días, salen del divisor y su domingo no se paga", () => {
    const vacaciones = ["16", "17", "18", "19", "20"].map((d) => marca(`2026-11-${d}`, "vacaciones"))
    const dias = libro({ marcas: vacaciones })
    const tramos = [{ desdeDia: 1, sueldo: 30000 }]
    const resumen = { ...SIN_AUSENCIAS, dias_vacaciones: 5 }
    assert.equal(sc.sueldoPorDias({ sistema: "diario", dias, tramos, resumen }).monto, 600000)
    const s = sc.calcularSemanaCorrida({ sistema: "diario", dias, tramos, resumen })
    assert.deepEqual([s.base, s.divisor, s.dias, s.monto], [450000, 15, 5, 150000])
    assert.ok(!s.fechas.includes("2026-11-22"))
})

test("licencia de una semana completa: sus días no son laborales y su domingo no se paga", () => {
    const dias = libro({ licencias: [{ fecha_inicio: "2026-11-23", fecha_termino: "2026-11-29" }] })
    const s = sc.calcularSemanaCorrida({ sistema: "diario", dias, tramos: [{ desdeDia: 1, sueldo: 30000 }], resumen: SIN_AUSENCIAS })
    assert.deepEqual([s.divisor, s.dias, s.monto], [15, 5, 150000])
})

test("resumen manual sin marcas: los días del resumen se descuentan igual", () => {
    const dias = libro()
    const resumen = { ...SIN_AUSENCIAS, dias_inasistencia: 2 }
    assert.equal(sc.sueldoPorDias({ sistema: "diario", dias, tramos: [{ desdeDia: 1, sueldo: 30000 }], resumen }).cantidad, 18)
    assert.equal(sc.calcularSemanaCorrida({ sistema: "diario", dias, tramos: [{ desdeDia: 1, sueldo: 30000 }], resumen }).divisor, 20)
})

test("sueldo mensual: la semana corrida es solo sobre lo variable de devengo diario", () => {
    const dias = libro()
    const s = sc.calcularSemanaCorrida({ sistema: "mensual", dias, tramos: [{ desdeDia: 1, sueldo: 600000 }], resumen: SIN_AUSENCIAS, variablesDiarias: 400000 })
    assert.deepEqual([s.sueldo, s.variables, s.monto], [0, 400000, 120000])
    assert.equal(sc.calcularSemanaCorrida({ sistema: "mensual", dias, tramos: [{ desdeDia: 1, sueldo: 600000 }], resumen: SIN_AUSENCIAS }).monto, 0)
})

test("contrato por hora: horas de la jornada (9 a 18 con 60 de colación = 8) y cambio de sueldo por anexo a mitad de mes", () => {
    const dias = libro()
    const tramos = [{ desdeDia: 1, sueldo: 4000 }, { desdeDia: 16, sueldo: 5000 }]
    // Del 2 al 13 hay 9 días laborales (el 13 es festivo) y del 16 al 30, 11.
    assert.deepEqual(sc.sueldoPorDias({ sistema: "hora", dias, tramos, resumen: SIN_AUSENCIAS }), { sistema: "hora", cantidad: 160, monto: 9 * 8 * 4000 + 11 * 8 * 5000 })
    assert.equal(sc.calcularSemanaCorrida({ sistema: "hora", dias, tramos, resumen: SIN_AUSENCIAS }).monto, Math.round((9 * 8 * 4000 + 11 * 8 * 5000) / 20 * 6))
})

test("jornada con domingo (art. 38): el descanso son los días libres de la semana", () => {
    const martesADomingo = LUNES_A_VIERNES.map((d) => ({ ...d, trabaja: d.dia !== 1 && d.dia !== 6 }))
    const s = sc.calcularSemanaCorrida({ sistema: "diario", dias: libro({ plantilla: martesADomingo }), tramos: [{ desdeDia: 1, sueldo: 30000 }], resumen: SIN_AUSENCIAS, trabajaDomingo: true })
    // Libres: lunes (2, 9, 16, 23, 30) y sábados (7, 14, 21, 28) + el festivo del viernes 13.
    assert.equal(s.dias, 10)
    assert.ok(s.fechas.includes("2026-11-02") && !s.fechas.includes("2026-11-01"))
})

test("ingreso a mitad de mes: solo cuentan los días del contrato", () => {
    const s = sc.calcularSemanaCorrida({ sistema: "diario", dias: libro({ desde: "2026-11-16" }), tramos: [{ desdeDia: 1, sueldo: 30000 }], resumen: SIN_AUSENCIAS })
    // Del 16 al 30: 11 días laborales y los domingos 22 y 29.
    assert.deepEqual([s.divisor, s.dias], [11, 2])
})

test("valorHoraPorDias: incluye un día de descanso y nunca baja del ingreso mínimo", () => {
    assert.equal(sc.valorHoraPorDias({ sistema: "diario", sueldo: 30000, diasSemana: 5, horasSemanales: 40, minimoPorHora: 3000 }), 4500)
    assert.equal(sc.valorHoraPorDias({ sistema: "hora", sueldo: 4000, diasSemana: 5, horasSemanales: 40, minimoPorHora: 3000 }), 4800)
    assert.equal(sc.valorHoraPorDias({ sistema: "diario", sueldo: 10000, diasSemana: 5, horasSemanales: 40, minimoPorHora: 3000 }), 3000)
})
