const { test } = require("node:test")
const assert = require("node:assert")
const { maximoSemanal, validarJornada, textoDistribucion, horasDelDia } = require("../src/contratos/jornada_legal.js")

function semana(lunesAJueves, viernes, sabado = null) {
    return [1, 2, 3, 4, 5, 6, 7].map((dia) => {
        const horario = dia <= 4 ? lunesAJueves : dia === 5 ? viernes : dia === 6 ? sabado : null
        return horario ? { dia, trabaja: true, ...horario } : { dia, trabaja: false }
    })
}

const OCHO_A_SEIS = { entrada: "08:00", salida: "18:00", colacion: 60 }
const OCHO_A_CINCO = { entrada: "08:00", salida: "17:00", colacion: 60 }

test("máximo semanal según la Ley 40 horas", () => {
    assert.strictEqual(maximoSemanal("2026-04-25"), 44)
    assert.strictEqual(maximoSemanal("2026-04-26"), 42)
    assert.strictEqual(maximoSemanal("2028-04-26"), 40)
})

test("jornada de 44 h: válida antes de abril 2026, excede desde entonces", () => {
    const dias = semana(OCHO_A_SEIS, OCHO_A_CINCO)
    const antes = validarJornada(dias, "2026-01-01")
    assert.deepStrictEqual(antes.errores, [])
    assert.strictEqual(antes.horasSemanales, 44)
    assert.strictEqual(antes.diasTrabajados, 5)

    const ahora = validarJornada(dias, "2026-10-28")
    assert.match(ahora.errores.join(), /máximo legal desde 2026-10-28 es 42/)
})

test("jornada de 42 h válida hoy", () => {
    const r = validarJornada(semana({ entrada: "08:00", salida: "17:30", colacion: 60 }, { entrada: "08:00", salida: "17:00", colacion: 60 }), "2026-10-28")
    assert.deepStrictEqual(r.errores, [])
    assert.strictEqual(r.horasSemanales, 42)
})

test("detecta más de 10 horas diarias, salida antes de entrada y días fuera de rango", () => {
    const largo = validarJornada(semana({ entrada: "07:00", salida: "19:00", colacion: 60 }, OCHO_A_CINCO), "2026-01-01")
    assert.match(largo.errores.join(), /10 horas/)

    const invertido = validarJornada(semana({ entrada: "18:00", salida: "08:00", colacion: 60 }, OCHO_A_CINCO), "2026-01-01")
    assert.match(invertido.errores.join(), /posterior a la entrada/)

    const tresDias = [1, 2, 3, 4, 5, 6, 7].map((dia) => dia <= 3 ? { dia, trabaja: true, ...OCHO_A_SEIS } : { dia, trabaja: false })
    assert.match(validarJornada(tresDias, "2026-01-01").errores.join(), /4 a 6 días/)
})

test("colación menor a 30 minutos es advertencia, no error", () => {
    const r = validarJornada(semana({ entrada: "08:00", salida: "16:00", colacion: 15 }, OCHO_A_CINCO), "2026-10-28")
    assert.deepStrictEqual(r.errores, [])
    assert.strictEqual(r.advertencias.length, 4)
})

test("exige los 7 días", () => {
    assert.match(validarJornada([{ dia: 1, trabaja: true }], "2026-10-28").errores.join(), /7 días/)
})

test("texto de distribución agrupa días con el mismo horario", () => {
    assert.strictEqual(textoDistribucion(semana(OCHO_A_SEIS, OCHO_A_CINCO)),
        "Lunes a jueves de 8:00 a 18:00 horas; viernes de 8:00 a 17:00 horas, con 60 minutos de colación diaria")
    assert.strictEqual(horasDelDia({ trabaja: true, entrada: "08:00", salida: "17:30", colacion: 60 }), 8.5)
})

// ---------- Paquete T: jornadas por ciclo ----------
const { numeroDelCiclo, diaDelCiclo, clausulaDistribucion } = require("../src/contratos/jornada_legal.js")

// Ciclo de n días: los días de trabajo (lista de números) con el mismo horario; el resto, descanso.
function ciclo(n, trabajo, horario) {
    return Array.from({ length: n }, (_, i) => trabajo.includes(i + 1) ? { dia: i + 1, trabaja: true, ...horario } : { dia: i + 1, trabaja: false })
}
const rango = (desde, hasta) => Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i)
const DOCE_HORAS = { entrada: "08:00", salida: "20:00", colacion: 60 }
const RESOLUCION = { resolucion_numero: "1234", resolucion_fecha: "2026-06-01", resolucion_vigencia_hasta: "2029-05-31" }

test("día del ciclo: semanal por día de la semana, por ciclo desde su inicio", () => {
    assert.strictEqual(numeroDelCiclo({ tipo: "semanal" }, "2026-11-23"), 1)
    assert.strictEqual(numeroDelCiclo({ tipo: "semanal" }, "2026-11-29"), 7)
    const turno = { tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-07" }
    assert.strictEqual(numeroDelCiclo(turno, "2026-12-07"), 1)
    assert.strictEqual(numeroDelCiclo(turno, "2026-12-20"), 14)
    assert.strictEqual(numeroDelCiclo(turno, "2026-12-21"), 1)
    assert.strictEqual(numeroDelCiclo(turno, "2026-12-06"), 14)
    const jornada = { ...turno, dias: ciclo(14, rango(1, 7), DOCE_HORAS) }
    assert.strictEqual(diaDelCiclo(jornada, "2026-12-13").trabaja, true)
    assert.strictEqual(diaDelCiclo(jornada, "2026-12-14").trabaja, false)
})

test("sistema excepcional 7x7: promedio semanal y resolución obligatoria", () => {
    const dias = ciclo(14, rango(1, 7), { entrada: "08:00", salida: "20:00", colacion: 60 })
    const r = validarJornada(dias, "2026-11-21", { tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-07", ...RESOLUCION })
    assert.deepStrictEqual(r.errores, [])
    assert.strictEqual(r.horasSemanales, 38.5)
    assert.strictEqual(r.diasTrabajados, 3.5)

    const sinResolucion = validarJornada(dias, "2026-11-21", { tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-07" })
    assert.match(sinResolucion.errores.join(), /número de la resolución/)
    const larga = validarJornada(dias, "2026-11-21", { tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-07", ...RESOLUCION, resolucion_vigencia_hasta: "2029-06-02" })
    assert.match(larga.errores.join(), /hasta tres años/)
    const vencida = validarJornada(dias, "2026-11-21", { tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-07", ...RESOLUCION, resolucion_fecha: "2023-01-01", resolucion_vigencia_hasta: "2025-12-31" })
    assert.match(vencida.advertencias.join(), /venció/)
})

test("sistema excepcional: hasta 12 horas diarias; promedio sobre el máximo es advertencia", () => {
    const trece = ciclo(8, rango(1, 4), { entrada: "07:00", salida: "21:00", colacion: 60 })
    assert.match(validarJornada(trece, "2026-11-21", { tipo: "excepcional", ciclo_dias: 8, inicio_ciclo: "2026-12-01", ...RESOLUCION }).errores.join(), /12 horas/)
    // 4x3 de 11 h: 44 × 7 / 7 = 44 h promedio.
    const alto = validarJornada(ciclo(7, rango(1, 4), { entrada: "08:00", salida: "20:00", colacion: 60 }), "2026-11-21", { tipo: "excepcional", ciclo_dias: 7, inicio_ciclo: "2026-12-01", ...RESOLUCION })
    assert.deepStrictEqual(alto.errores, [])
    assert.match(alto.advertencias.join(), /sobre el máximo legal de 42/)
})

test("jornada en promedio (art. 22 bis): ciclo de semanas que empieza lunes, 45 h por semana y promedio legal", () => {
    // Semana 1: 5 días de 9 h = 45; semana 2: 4 días de 9,75 h = 39 → promedio 42.
    const s1 = rango(1, 5).map((dia) => ({ dia, trabaja: true, entrada: "08:00", salida: "18:00", colacion: 60 }))
    const s2 = rango(8, 11).map((dia) => ({ dia, trabaja: true, entrada: "08:00", salida: "18:45", colacion: 60 }))
    const dias = rango(1, 14).map((dia) => s1.find((d) => d.dia === dia) ?? s2.find((d) => d.dia === dia) ?? { dia, trabaja: false })
    const ok = validarJornada(dias, "2026-11-21", { tipo: "promedio", ciclo_dias: 14, inicio_ciclo: "2026-11-30" })
    assert.deepStrictEqual(ok.errores, [])
    assert.strictEqual(ok.horasSemanales, 42)

    assert.match(validarJornada(dias, "2026-11-21", { tipo: "promedio", ciclo_dias: 14, inicio_ciclo: "2026-12-01" }).errores.join(), /empezar un lunes/)
    assert.match(validarJornada(dias.slice(0, 10), "2026-11-21", { tipo: "promedio", ciclo_dias: 10, inicio_ciclo: "2026-11-30" }).errores.join(), /14, 21 o 28/)

    const pesada = rango(1, 14).map((dia) => dia <= 5 ? { dia, trabaja: true, entrada: "07:00", salida: "17:00", colacion: 30 } : dia >= 8 && dia <= 10 ? { dia, trabaja: true, entrada: "08:00", salida: "15:00", colacion: 0 } : { dia, trabaja: false })
    assert.match(validarJornada(pesada, "2026-11-21", { tipo: "promedio", ciclo_dias: 14, inicio_ciclo: "2026-11-30" }).errores.join(), /semana 1 del ciclo suma 47,5|semana 1 del ciclo suma 47.5/)
})

test("jornada bisemanal (art. 39): hasta 14 días seguidos y aviso del descanso", () => {
    // 10 días de 8 h y 4 de descanso: 80 × 7 / 14 = 40 h.
    const diezPorCuatro = ciclo(14, rango(1, 10), { entrada: "08:00", salida: "17:00", colacion: 60 })
    const r = validarJornada(diezPorCuatro, "2026-11-21", { tipo: "bisemanal", ciclo_dias: 14, inicio_ciclo: "2026-12-01" })
    assert.deepStrictEqual(r.errores, [])
    assert.strictEqual(r.horasSemanales, 40)
    assert.deepStrictEqual(r.advertencias, [])

    const quince = ciclo(20, rango(1, 15), { entrada: "08:00", salida: "14:00", colacion: 0 })
    assert.match(validarJornada(quince, "2026-11-21", { tipo: "bisemanal", ciclo_dias: 20, inicio_ciclo: "2026-12-01" }).errores.join(), /hasta 14 días seguidos/)

    const pocoDescanso = ciclo(14, rango(1, 12), { entrada: "08:00", salida: "14:00", colacion: 0 })
    assert.match(validarJornada(pocoDescanso, "2026-11-21", { tipo: "bisemanal", ciclo_dias: 14, inicio_ciclo: "2026-12-01" }).advertencias.join(), /hasta 3 días y el ciclo tiene 2/)
})

test("texto y cláusula de una jornada por ciclo", () => {
    const jornada = { tipo: "excepcional", ciclo_dias: 14, inicio_ciclo: "2026-12-07", dias: ciclo(14, rango(1, 7), DOCE_HORAS), ...RESOLUCION }
    assert.strictEqual(textoDistribucion(jornada.dias, "excepcional"), "Días 1 a 7 de 8:00 a 20:00 horas; días 8 a 14 de descanso, con 60 minutos de colación diaria")
    assert.strictEqual(clausulaDistribucion(jornada, 38.5),
        "La jornada ordinaria de trabajo se regirá por el sistema excepcional de distribución de jornada de trabajo y descansos autorizado por la Dirección del Trabajo mediante Resolución N° 1234, de 1 de junio de 2026, vigente hasta el 31 de mayo de 2029, conforme al inciso séptimo del artículo 38 del Código del Trabajo, en ciclos de 14 días contados desde el 7 de diciembre de 2026, con un promedio de 38,5 horas semanales: Días 1 a 7 de 8:00 a 20:00 horas; días 8 a 14 de descanso, con 60 minutos de colación diaria.")
    assert.strictEqual(clausulaDistribucion({ tipo: "semanal", dias: semana(OCHO_A_SEIS, OCHO_A_CINCO) }, 44),
        "La jornada ordinaria de trabajo será de 44 horas semanales, distribuidas de la siguiente manera: Lunes a jueves de 8:00 a 18:00 horas; viernes de 8:00 a 17:00 horas, con 60 minutos de colación diaria.")
})
