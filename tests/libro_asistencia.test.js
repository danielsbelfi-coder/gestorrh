const test = require("node:test")
const assert = require("node:assert")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")

// Octubre 2027: el 1 es viernes; feriados el lunes 11 y el domingo 31.
// Jornada 42 h: lunes a jueves 8:00 a 17:30, viernes 8:00 a 17:00, 60 min de colación.
const JORNADA = [1, 2, 3, 4, 5, 6, 7].map((dia) => dia <= 4
    ? { dia, trabaja: true, entrada: "08:00", salida: "17:30", colacion: 60 }
    : dia === 5 ? { dia, trabaja: true, entrada: "08:00", salida: "17:00", colacion: 60 } : { dia, trabaja: false })
const FERIADOS = [{ fecha: "2027-10-11", nombre: "Encuentro de Dos Mundos" }, { fecha: "2027-10-31", nombre: "Iglesias Evangélicas" }]

function libro(marcas, extra = {}) {
    return calcularLibro({ anio: 2027, mes: 10, desde: "2027-01-01", tramosJornada: [{ desde: "2027-01-01", dias: JORNADA }], feriados: FERIADOS, marcas, ...extra })
}
function marca(fecha, entrada, salida, otros = {}) {
    return { fecha, hora_entrada: entrada, hora_salida: salida, tipo: "normal", estado_aprobacion: "aprobada", ...otros }
}
function dia(resultado, fecha) {
    return resultado.dias.find((d) => d.fecha === fecha)
}

test("sin marcas: 31 días, nada que descontar, feriados y fines de semana marcados", () => {
    const r = libro([])
    assert.strictEqual(r.dias.length, 31)
    assert.strictEqual(r.totales.minutos_atraso, 0)
    assert.strictEqual(r.totales.minutos_extra, 0)
    assert.strictEqual(dia(r, "2027-10-11").esperado.tipo, "feriado")
    assert.strictEqual(dia(r, "2027-10-09").esperado.tipo, "libre")
    assert.deepStrictEqual(dia(r, "2027-10-08").esperado, { tipo: "laboral", entrada: "08:00", salida: "17:00", colacion: 60 })
})

test("tolerancia: 5 minutos no se descuentan; desde el minuto 6 se descuentan todos", () => {
    assert.strictEqual(libro([marca("2027-10-04", "08:05:00", null)]).totales.minutos_atraso, 0)
    assert.strictEqual(libro([marca("2027-10-04", "08:06:00", null)]).totales.minutos_atraso, 6)
    assert.strictEqual(libro([marca("2027-10-04", "08:08", null)]).totales.minutos_atraso, 8)
})

test("el atraso se compensa el mismo día quedándose después de la salida", () => {
    const r = libro([marca("2027-10-04", "08:10", "17:40")])
    assert.strictEqual(dia(r, "2027-10-04").compensado, 10)
    assert.strictEqual(r.totales.minutos_atraso, 0)
    assert.strictEqual(r.totales.minutos_extra, 0)
})

test("la tolerancia se aplica al atraso que queda después de compensar", () => {
    assert.strictEqual(libro([marca("2027-10-04", "08:10", "17:34")]).totales.minutos_atraso, 6)
    assert.strictEqual(libro([marca("2027-10-04", "08:10", "17:36")]).totales.minutos_atraso, 0)
})

test("lo que pasa de la salida sin atraso es hora extra (el viernes sale a las 17:00)", () => {
    const r = libro([marca("2027-10-04", "08:00", "19:00"), marca("2027-10-08", null, "17:30")])
    assert.strictEqual(dia(r, "2027-10-04").minutosExtra, 90)
    assert.strictEqual(dia(r, "2027-10-08").minutosExtra, 30)
    assert.strictEqual(r.totales.horas_extra, 2)
})

test("llegar antes de la hora de entrada no cuenta como extra", () => {
    assert.strictEqual(libro([marca("2027-10-04", "07:30", "17:30")]).totales.minutos_extra, 0)
})

test("salida anticipada: se descuenta desde el primer minuto, sin tolerancia", () => {
    assert.strictEqual(libro([marca("2027-10-04", null, "17:29")]).totales.minutos_atraso, 1)
    assert.strictEqual(libro([marca("2027-10-04", null, "17:25")]).totales.minutos_atraso, 5)
    assert.strictEqual(libro([marca("2027-10-04", null, "17:20")]).totales.minutos_atraso, 10)
    // Atraso y salida anticipada el mismo día: se suman (la tolerancia aplica solo al atraso).
    assert.strictEqual(libro([marca("2027-10-04", "08:07", "17:20")]).totales.minutos_atraso, 17)
})

test("marca pendiente se calcula pero no suma; rechazada se ignora", () => {
    const r = libro([marca("2027-10-04", "08:20", null, { estado_aprobacion: "pendiente" }), marca("2027-10-05", "08:30", null, { estado_aprobacion: "rechazada" })])
    assert.strictEqual(dia(r, "2027-10-04").minutosDescuento, 20)
    assert.strictEqual(dia(r, "2027-10-04").cuenta, false)
    assert.strictEqual(dia(r, "2027-10-05").minutosDescuento, 0)
    assert.strictEqual(r.totales.minutos_atraso, 0)
    assert.strictEqual(r.totales.marcas_pendientes, 1)
})

test("trabajo en sábado: todas las horas menos la colación son extra, con advertencias", () => {
    const r = libro([marca("2027-10-09", "09:00", "14:00")])
    assert.strictEqual(dia(r, "2027-10-09").minutosExtra, 240)
    assert.strictEqual(dia(r, "2027-10-09").advertencias.length, 2)
    assert.strictEqual(r.totales.horas_extra, 4)
})

test("trabajo en feriado: horas extra; sin hora de salida no se calcula", () => {
    assert.strictEqual(libro([marca("2027-10-11", "08:00", "12:00")]).totales.minutos_extra, 180)
    const sinSalida = libro([marca("2027-10-11", "08:00", null)])
    assert.strictEqual(sinSalida.totales.minutos_extra, 0)
    assert.strictEqual(dia(sinSalida, "2027-10-11").cuenta, false)
})

test("inasistencias, permisos y vacaciones cuentan solo en días laborales", () => {
    const r = libro([
        marca("2027-10-04", null, null, { tipo: "inasistencia" }),
        marca("2027-10-05", null, null, { tipo: "permiso_sin_goce" }),
        marca("2027-10-06", null, null, { tipo: "vacaciones" }),
        marca("2027-10-11", null, null, { tipo: "inasistencia" })
    ])
    assert.strictEqual(r.totales.dias_inasistencia, 1)
    assert.strictEqual(r.totales.dias_permiso_sin_goce, 1)
    assert.strictEqual(r.totales.dias_vacaciones, 1)
    assert.strictEqual(dia(r, "2027-10-11").advertencias.length, 1)
})

test("días con licencia o fuera del contrato no consideran marcas", () => {
    const r = libro([marca("2027-10-04", "08:30", null), marca("2027-10-20", "08:30", null)], {
        desde: "2027-10-15",
        licencias: [{ fecha_inicio: "2027-10-19", fecha_termino: "2027-10-21" }]
    })
    assert.strictEqual(dia(r, "2027-10-04").esperado.tipo, "fuera_contrato")
    assert.strictEqual(dia(r, "2027-10-20").esperado.tipo, "licencia")
    assert.strictEqual(r.totales.minutos_atraso, 0)
})

test("contrato terminado a mitad de mes", () => {
    const r = libro([], { hasta: "2027-10-15" })
    assert.strictEqual(dia(r, "2027-10-18").esperado.tipo, "fuera_contrato")
})

test("sin plantilla de jornada: no calcula minutos, pero sí cuenta inasistencias", () => {
    const r = calcularLibro({
        anio: 2027, mes: 10, desde: "2027-01-01", tramosJornada: [], feriados: FERIADOS,
        marcas: [marca("2027-10-04", "08:30", null), marca("2027-10-05", null, null, { tipo: "inasistencia" })]
    })
    assert.strictEqual(r.advertencias.length, 1)
    assert.strictEqual(r.totales.minutos_atraso, 0)
    assert.strictEqual(r.totales.dias_inasistencia, 1)
})

test("cambio de jornada a mitad de mes (anexo): cada día usa la plantilla vigente", () => {
    const temprano = JORNADA.map((d) => d.trabaja ? { ...d, entrada: "07:00", salida: "16:30" } : d)
    const r = libro([marca("2027-10-12", "08:10", null), marca("2027-10-19", "07:10", null)], {
        tramosJornada: [{ desde: "2027-01-01", dias: JORNADA }, { desde: "2027-10-18", dias: temprano }]
    })
    assert.strictEqual(dia(r, "2027-10-12").minutosDescuento, 10)
    assert.strictEqual(dia(r, "2027-10-19").minutosDescuento, 10)
    assert.strictEqual(r.totales.minutos_atraso, 20)
})

test("salida anterior a la entrada: advertencia y no suma", () => {
    const r = libro([marca("2027-10-04", "18:00", "09:00")])
    assert.strictEqual(dia(r, "2027-10-04").cuenta, false)
    assert.strictEqual(r.totales.minutos_atraso, 0)
})

test("recargo por marca: los totales separan horas al 50 % y al 100 % (sin recargo indicado = 50 %)", () => {
    const r = libro([
        marca("2027-10-04", "08:00", "19:00"),
        marca("2027-10-05", "08:00", "18:30", { recargo_hora_extra: 50 }),
        marca("2027-10-09", "09:00", "14:00", { recargo_hora_extra: 100 }),
        marca("2027-10-06", "08:00", "19:30", { recargo_hora_extra: 100, estado_aprobacion: "pendiente" })
    ])
    assert.strictEqual(dia(r, "2027-10-04").recargo, 50)
    assert.strictEqual(dia(r, "2027-10-09").recargo, 100)
    assert.strictEqual(r.totales.minutos_extra_50, 90 + 60)
    assert.strictEqual(r.totales.minutos_extra_100, 240)
    assert.strictEqual(r.totales.horas_extra_50, 2.5)
    assert.strictEqual(r.totales.horas_extra_100, 4)
    assert.strictEqual(r.totales.horas_extra, 6.5)
})

test("trabajo en feriado: descuenta la colación de ese día de la jornada, no la habitual", () => {
    // Viernes 8:00 a 14:00 sin colación (como la jornada J1 de la prueba 3); el resto con 60 min.
    const corta = JORNADA.map((d) => d.dia === 5 ? { dia: 5, trabaja: true, entrada: "08:00", salida: "14:00", colacion: 0 } : d)
    const viernesSanto = [{ fecha: "2027-10-01", nombre: "Feriado de prueba" }]
    const r = calcularLibro({ anio: 2027, mes: 10, desde: "2027-01-01", tramosJornada: [{ desde: "2027-01-01", dias: corta }], feriados: viernesSanto, marcas: [marca("2027-10-01", "08:00", "14:00")] })
    assert.strictEqual(r.totales.minutos_extra, 360)
    // Un sábado (día libre) sigue descontando la colación habitual.
    const sabado = calcularLibro({ anio: 2027, mes: 10, desde: "2027-01-01", tramosJornada: [{ desde: "2027-01-01", dias: corta }], feriados: [], marcas: [marca("2027-10-02", "08:00", "13:00")] })
    assert.strictEqual(sabado.totales.minutos_extra, 240)
})

test("pagadores de subsidio: las cajas de compensación están en la tabla, con DV en mayúscula o minúscula", () => {
    const { buscarPagador } = require("../src/asistencia/pagadores_subsidio.js")
    assert.strictEqual(buscarPagador("81826800-9").nombre, "Caja Los Andes")
    assert.strictEqual(buscarPagador("70016330-k").nombre, "Caja Los Héroes")
    assert.strictEqual(buscarPagador("82606800-0").nombre, "Caja 18 de Septiembre")
    assert.strictEqual(buscarPagador("12345678-9"), null)
})

test("jornada por ciclo (7x7): el horario esperado sigue el ciclo desde su inicio, sin importar el día de la semana", () => {
    // Ciclo de 14 días desde el lunes 04-10-2027: días 1 a 7 trabaja 8:00–20:00, 8 a 14 descanso.
    const dias = Array.from({ length: 14 }, (_, i) => i < 7 ? { dia: i + 1, trabaja: true, entrada: "08:00", salida: "20:00", colacion: 60 } : { dia: i + 1, trabaja: false })
    const tramo = { desde: "2027-01-01", dias, tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2027-10-04" }
    const r = calcularLibro({ anio: 2027, mes: 10, desde: "2027-01-01", tramosJornada: [tramo], feriados: FERIADOS, marcas: [marca("2027-10-09", "08:00", "21:00"), marca("2027-10-12", "08:00", "12:00")] })
    // Sábado 09 y domingo 10: días 6 y 7 del ciclo, laborales.
    assert.strictEqual(dia(r, "2027-10-09").esperado.tipo, "laboral")
    assert.strictEqual(dia(r, "2027-10-09").minutosExtra, 60)
    assert.strictEqual(dia(r, "2027-10-10").esperado.tipo, "laboral")
    // Lunes 11 (feriado) es día 8: descanso del ciclo, el festivo no cae en jornada.
    assert.strictEqual(dia(r, "2027-10-11").esperado.enJornada, false)
    // Martes 12: día 9, descanso; trabajar ahí es trabajo en día libre (todo extra, menos la colación habitual).
    assert.strictEqual(dia(r, "2027-10-12").esperado.tipo, "libre")
    assert.strictEqual(dia(r, "2027-10-12").minutosExtra, 180)
    // Lunes 18: día 1 del ciclo siguiente.
    assert.strictEqual(dia(r, "2027-10-18").esperado.tipo, "laboral")
    // 1 y 2 de octubre (antes del inicio): días 13 y 14 del ciclo anterior, descanso.
    assert.strictEqual(dia(r, "2027-10-01").esperado.tipo, "libre")
})
