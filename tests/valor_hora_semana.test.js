const test = require("node:test")
const assert = require("node:assert/strict")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")
const sc = require("../src/remuneraciones/semana_corrida.js")
const vh = require("../src/remuneraciones/valor_hora.js")
const { calcularLineasBase } = require("../src/remuneraciones/calculo_lineas.js")

const L_V = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({ dia, trabaja: dia <= 5, entrada: "08:00", salida: dia === 5 ? "17:00" : "17:30", colacion: 60 }))
const L_S = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({ dia, trabaja: dia <= 6, entrada: "08:00", salida: "15:00", colacion: 0 }))
const SIN_AUSENCIAS = { dias_inasistencia: 0, dias_permiso_sin_goce: 0, dias_vacaciones: 0 }
// Octubre de 2026: sábado 31 es festivo (Día de las Iglesias Evangélicas) y el lunes 12 también.
const FERIADOS = [{ fecha: "2026-10-12", nombre: "Encuentro de Dos Mundos" }, { fecha: "2026-10-31", nombre: "Iglesias Evangélicas" }]
const libroOct = (plantilla, marcas = []) => calcularLibro({ anio: 2026, mes: 10, desde: "2026-01-01", tramosJornada: [{ desde: "0000-01-01", dias: plantilla }], feriados: FERIADOS, marcas }).dias

test("semana corrida: el sábado festivo no se paga en una jornada de lunes a viernes", () => {
    const fechas = sc.diasDeDescanso(libroOct(L_V), false)
    assert.ok(!fechas.includes("2026-10-31"), "sábado 31 es descanso convencional")
    assert.ok(fechas.includes("2026-10-12"), "el lunes festivo sí se paga")
    assert.deepEqual(fechas.filter((f) => ["2026-10-04", "2026-10-11", "2026-10-18", "2026-10-25"].includes(f)).length, 4, "los domingos se pagan")
    assert.equal(fechas.length, 5)
})

test("semana corrida: con jornada de lunes a sábado, el sábado festivo sí se paga", () => {
    assert.ok(sc.diasDeDescanso(libroOct(L_S), false).includes("2026-10-31"))
})

test("valor hora: factor DT para sueldo mensual", () => {
    assert.equal(vh.valorHoraOrdinaria(900000, 42), 5000)
    assert.equal(Math.round(vh.valorHoraOrdinaria(900000, 45) * 100) / 100, 4666.67)
})

// Noviembre 2026, anexo de sueldo de 720.000 a 810.000 desde el 16.
const L_V_NOV = (marcas) => calcularLibro({ anio: 2026, mes: 11, desde: "2026-01-01", tramosJornada: [{ desde: "0000-01-01", dias: L_V }], feriados: [], marcas }).dias
const m = (fecha, extra) => ({ fecha, tipo: "normal", estado_aprobacion: "aprobada", recargo_hora_extra: 50, ...extra })

test("anexo a mitad de mes: horas extra y atrasos con el sueldo vigente ese día (ponderado)", () => {
    const porTramo = vh.valoresHoraPorTramo([{ desdeDia: 1, sueldo: 720000 }, { desdeDia: 16, sueldo: 810000 }], 42)
    assert.deepEqual(porTramo, [{ desdeDia: 1, valorHora: 4000 }, { desdeDia: 16, valorHora: 4500 }])
    const dias = L_V_NOV([
        m("2026-11-05", { hora_entrada: "08:00", hora_salida: "19:30" }), // 2 h antes del anexo
        m("2026-11-19", { hora_entrada: "08:00", hora_salida: "19:30" }), // 2 h después
        m("2026-11-10", { hora_entrada: "08:25", hora_salida: "17:30", tipo: "atraso" }) // 25 min antes
    ])
    const r = vh.valoresHoraDelLibro(dias, porTramo)
    assert.equal(r[50], 4250)
    assert.equal(r[100], null)
    assert.equal(r.atraso, 4000)
})

test("las líneas usan el valor hora de cada variable y el de los atrasos", () => {
    const conceptos = { SUELDO_BASE: { codigo: "SUELDO_BASE" }, DESCUENTO_ATRASOS: { codigo: "DESCUENTO_ATRASOS" }, GRATIFICACION: { codigo: "GRATIFICACION" } }
    const he50 = { codigo: "HORAS_EXTRA_50", recargo_hora_extra: 50 }
    const { lineas } = calcularLineasBase({
        sueldoBase: 810000, horasSemanales: 42, diasPagados: 30, variables: [
            { concepto: he50, cantidad: 2, valorHora: 4000 }, // del libro, antes del anexo
            { concepto: he50, cantidad: 1, valorHora: 3500 }, // pendiente de un mes con sueldo 630.000
            { concepto: he50, cantidad: 1 } // sin valor propio: el del mes (4.500)
        ], minutosAtraso: 25, valorHoraAtraso: 4000, ingresoMinimoMensual: 553553, conceptos
    })
    assert.equal(lineas.find((l) => l.concepto === he50).monto, Math.round((2 * 4000 + 3500 + 4500) * 1.5))
    assert.equal(lineas.find((l) => l.concepto.codigo === "DESCUENTO_ATRASOS").monto, 1667)
})
