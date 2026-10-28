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
