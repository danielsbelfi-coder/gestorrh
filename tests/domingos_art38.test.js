const test = require("node:test")
const assert = require("node:assert")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")
const { reglasDomingo, avisoDosDomingos } = require("../src/asistencia/domingos_art38.js")
const { validarJornada } = require("../src/contratos/jornada_legal.js")

// Semanal de martes a domingo, 9:00 a 17:00 con 60 min (7 h × 6 = 42 h): trabaja todos los domingos; libre el lunes.
const SEMANAL = [{ dia: 1, trabaja: false }, ...[2, 3, 4, 5, 6, 7].map((dia) => ({ dia, trabaja: true, entrada: "09:00", salida: "17:00", colacion: 60 }))]
const TRAMOS = [{ desde: "0000-01-01", tipo: "semanal", dias: SEMANAL, jornada_id: 1 }]
const libroDe = (marcas = [], tramos = TRAMOS) => calcularLibro({ anio: 2027, mes: 2, desde: "2026-01-01", tramosJornada: tramos, feriados: [], marcas })
const aprobada = (fecha, tipo, otros = {}) => ({ fecha, tipo, estado_aprobacion: "aprobada", ...otros })
const CONTRATO_N7 = { art38_causal: "n7", recargo_domingo: "30.00", horas_semanales: "42", tipo_contrato: "indefinido", fecha_inicio: "2026-01-01" }

test("domingos del mes: febrero 2027 tiene 4 domingos de trabajo con 7 h ordinarias cada uno", () => {
    const r = libroDe()
    assert.strictEqual(r.totales.domingos_trabajados, 4)
    assert.strictEqual(r.totales.domingos_libres, 0)
    assert.strictEqual(r.totales.minutos_domingo_ordinarios, 4 * 7 * 60)
})

test("domingo libre con día de reemplazo: el domingo queda libre y el lunes se trabaja con su horario", () => {
    const r = libroDe([aprobada("2027-02-07", "domingo_libre", { fecha_reemplazo: "2027-02-01" })])
    const domingo = r.dias.find((d) => d.fecha === "2027-02-07")
    const lunes = r.dias.find((d) => d.fecha === "2027-02-01")
    assert.deepStrictEqual(domingo.esperado, { tipo: "libre", colacion: 60, domingoLibre: true })
    assert.strictEqual(lunes.esperado.tipo, "laboral")
    assert.strictEqual(lunes.esperado.reemplazo, true)
    assert.strictEqual(r.totales.domingos_libres, 1)
    assert.strictEqual(r.totales.domingos_trabajados, 3)
    // Un domingo libre en un domingo que no es de trabajo no se considera.
    const otro = libroDe([aprobada("2027-02-03", "domingo_libre")])
    assert.strictEqual(otro.dias.find((d) => d.fecha === "2027-02-03").cuenta, false)
})

test("horas extra al 50 % en domingo: aparte, para la base con el recargo del N° 7", () => {
    const r = libroDe([aprobada("2027-02-14", "normal", { hora_entrada: "09:00", hora_salida: "19:00" })])
    assert.strictEqual(r.totales.minutos_extra_domingo_50, 120)
})

test("reglas: N° 7 con recargo y dos domingos; las excepciones quitan el mínimo de domingos pero no el recargo", () => {
    const n7 = reglasDomingo(CONTRATO_N7)
    assert.strictEqual(n7.n7, true)
    assert.strictEqual(n7.recargo, 30)
    assert.strictEqual(n7.dosDomingos, true)
    const parcial = reglasDomingo({ ...CONTRATO_N7, horas_semanales: "20" })
    assert.strictEqual(parcial.dosDomingos, false)
    assert.strictEqual(parcial.n7, true)
    const corto = reglasDomingo({ ...CONTRATO_N7, tipo_contrato: "plazo_fijo", fecha_termino: "2026-01-30" })
    assert.deepStrictEqual(corto.excepciones, ["contrato de 30 días o menos"])
    const n2 = reglasDomingo({ ...CONTRATO_N7, art38_causal: "n2" })
    assert.strictEqual(n2.recargo, 0)
    assert.strictEqual(n2.dosDomingos, true)
    assert.strictEqual(reglasDomingo({ ...CONTRATO_N7, art38_causal: "ninguna" }).dosDomingos, false)
})

test("aviso de dos domingos libres: con uno avisa; con dos no", () => {
    const reglas = reglasDomingo(CONTRATO_N7)
    const uno = libroDe([aprobada("2027-02-07", "domingo_libre")])
    assert.match(avisoDosDomingos(reglas, uno.totales, 4), /1 domingo\(s\) libre\(s\) y corresponden al menos 2/)
    const dos = libroDe([aprobada("2027-02-07", "domingo_libre"), aprobada("2027-02-21", "domingo_libre")])
    assert.strictEqual(avisoDosDomingos(reglas, dos.totales, 4), null)
})

test("jornada semanal rotativa: domingo sí, domingo no, cada semana revisada como semanal", () => {
    const semana1 = SEMANAL.map((d) => ({ ...d }))
    const semana2 = [...[1, 2, 3, 4, 5, 6].map((dia) => ({ dia: dia + 7, trabaja: dia <= 6, entrada: "09:00", salida: "17:00", colacion: 60 })), { dia: 14, trabaja: false }]
    const r = validarJornada([...semana1, ...semana2], "2027-01-04", { tipo: "rotativa", ciclo_dias: 14, inicio_ciclo: "2027-01-04" })
    assert.deepStrictEqual(r.errores, [])
    assert.strictEqual(r.horasSemanales, 42)
    // Una semana con 7 días de trabajo no es una jornada semanal válida.
    const mala = validarJornada([...semana1, ...semana2.map((d) => ({ ...d, trabaja: true, entrada: "09:00", salida: "15:00", colacion: 60 }))], "2027-01-04", { tipo: "rotativa", ciclo_dias: 14, inicio_ciclo: "2027-01-04" })
    assert.ok(mala.errores.some((e) => /semana 2 del ciclo debe distribuirse/.test(e)))
    // El libro alterna: el domingo 10-01 se trabaja y el 17-01 es libre.
    const tramos = [{ desde: "0000-01-01", tipo: "rotativa", ciclo_dias: 14, inicio_ciclo: "2027-01-04", dias: r.dias, jornada_id: 2 }]
    const enero = calcularLibro({ anio: 2027, mes: 1, desde: "2026-01-01", tramosJornada: tramos, feriados: [], marcas: [] })
    assert.strictEqual(enero.dias.find((d) => d.fecha === "2027-01-10").esperado.tipo, "laboral")
    assert.strictEqual(enero.dias.find((d) => d.fecha === "2027-01-17").esperado.tipo, "libre")
})

const { anualidadDe, avisos38bis } = require("../src/asistencia/domingos_38bis.service.js")
const { montosFiniquito } = require("../src/remuneraciones/calculo_finiquito.js")

test("art. 38 bis: anualidad desde el ingreso o por año calendario", () => {
    assert.deepStrictEqual(anualidadDe("2025-03-15", { domingos_38bis_anio: "contrato" }, "2026-11-30"), { desde: "2026-03-15", hasta: "2027-03-14" })
    assert.deepStrictEqual(anualidadDe("2025-03-15", { domingos_38bis_anio: "contrato" }, "2026-03-14"), { desde: "2025-03-15", hasta: "2026-03-14" })
    assert.deepStrictEqual(anualidadDe("2024-02-29", { domingos_38bis_anio: "contrato" }, "2025-03-01"), { desde: "2025-02-28", hasta: "2026-02-27" })
    assert.deepStrictEqual(anualidadDe("2026-06-10", { domingos_38bis_anio: "calendario" }, "2026-11-30"), { desde: "2026-06-10", hasta: "2026-12-31" })
})

test("art. 38 bis: avisos al cerrar la anualidad incompleta y cuando quedan 2 meses o menos", () => {
    const base = { desde: "2026-03-15", hasta: "2027-03-14", otorgados: 4, pendientes: 3 }
    assert.deepStrictEqual(avisos38bis(base, "2026-11-30"), [])
    assert.match(avisos38bis(base, "2027-01-31")[0], /faltan 3 de 7/)
    assert.match(avisos38bis(base, "2027-03-31")[0], /terminó con 4 de 7/)
    assert.deepStrictEqual(avisos38bis({ ...base, otorgados: 7, pendientes: 0 }, "2027-03-31"), [])
})

test("finiquito: los domingos del 38 bis no otorgados suman a los haberes", () => {
    const comun = { causal: 159, avisoPrevioDado: true, tiempo: { anios: 0, meses: 8, dias: 0 }, baseIndemnizacion: 600000, baseFeriado: 600000, topeUF: 90, valorUF: 39000, diasPendientes: 0, diasInhabiles: 0, imputacionAfc: 0, descuentos: [] }
    const sin = montosFiniquito(comun)
    const con = montosFiniquito({ ...comun, montoDomingos38bis: 60000 })
    assert.strictEqual(con.montoDomingos38bis, 60000)
    assert.strictEqual(con.totalHaberes - sin.totalHaberes, 60000)
})
