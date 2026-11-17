const { test } = require("node:test")
const assert = require("node:assert")
const { validarReglaPago, fechaDePago, rangoFeriados, textoReglaPago } = require("../src/remuneraciones/fecha_pago.js")

test("sin regla no hay fecha de pago", () => {
    assert.strictEqual(fechaDePago({ regla: null, anio: 2026, mes: 11 }), null)
    assert.deepStrictEqual(validarReglaPago({ regla_fecha_pago: "" }), { datos: { regla_fecha_pago: null, dia_pago: null }, errores: [] })
})

test("último día hábil: noviembre 2026 termina en lunes 30", () => {
    assert.strictEqual(fechaDePago({ regla: "ultimo_dia_habil", anio: 2026, mes: 11 }), "2026-11-30")
})

test("último día hábil: octubre 2026 (sábado 31, feriado) se adelanta al viernes 30", () => {
    assert.strictEqual(fechaDePago({ regla: "ultimo_dia_habil", anio: 2026, mes: 10, feriados: ["2026-10-31"] }), "2026-10-30")
})

test("último día hábil: un feriado el viernes también se salta", () => {
    // Mayo 2026: domingo 31, sábado 30, viernes 29 feriado inventado → jueves 28.
    assert.strictEqual(fechaDePago({ regla: "ultimo_dia_habil", anio: 2026, mes: 5, feriados: new Set(["2026-05-29"]) }), "2026-05-28")
})

test("día N del mes siguiente, cruce de año y adelanto por fin de semana", () => {
    // Diciembre 2026 → 5 de enero 2027 (martes).
    assert.strictEqual(fechaDePago({ regla: "dia_mes_siguiente", dia: 5, anio: 2026, mes: 12 }), "2027-01-05")
    // Octubre 2026 → 1 de noviembre (domingo, feriado) → viernes 30 de octubre.
    assert.strictEqual(fechaDePago({ regla: "dia_mes_siguiente", dia: 1, anio: 2026, mes: 10, feriados: ["2026-11-01"] }), "2026-10-30")
})

test("día 31 en un mes de 30 días se toma como el último día", () => {
    // Octubre → noviembre tiene 30 días: lunes 30.
    assert.strictEqual(fechaDePago({ regla: "dia_mes_siguiente", dia: 31, anio: 2026, mes: 10 }), "2026-11-30")
    // Enero 2027 → febrero 2027 (28, domingo) → viernes 26.
    assert.strictEqual(fechaDePago({ regla: "dia_mes_siguiente", dia: 30, anio: 2027, mes: 1 }), "2027-02-26")
})

test("validación de la regla", () => {
    assert.deepStrictEqual(validarReglaPago({ regla_fecha_pago: "ultimo_dia_habil", dia_pago: 10 }).datos, { regla_fecha_pago: "ultimo_dia_habil", dia_pago: null })
    assert.deepStrictEqual(validarReglaPago({ regla_fecha_pago: "dia_mes_siguiente", dia_pago: "5" }), { datos: { regla_fecha_pago: "dia_mes_siguiente", dia_pago: 5 }, errores: [] })
    assert.strictEqual(validarReglaPago({ regla_fecha_pago: "dia_mes_siguiente", dia_pago: null }).errores.length, 1)
    assert.strictEqual(validarReglaPago({ regla_fecha_pago: "dia_mes_siguiente", dia_pago: 32 }).errores.length, 1)
    assert.strictEqual(validarReglaPago({ regla_fecha_pago: "quincena" }).errores.length, 1)
})

test("rango de feriados: el mes del periodo y el siguiente", () => {
    assert.deepStrictEqual(rangoFeriados(2026, 12), { desde: "2026-12-01", hasta: "2027-01-31" })
    assert.deepStrictEqual(rangoFeriados(2027, 1), { desde: "2027-01-01", hasta: "2027-02-28" })
    assert.match(textoReglaPago("dia_mes_siguiente", 5), /Día 5 del mes siguiente/)
})
