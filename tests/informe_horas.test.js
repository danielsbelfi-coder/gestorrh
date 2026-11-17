const { test } = require("node:test")
const assert = require("node:assert")
const { armarInformeHoras, lineasDelInforme, repartir } = require("../src/remuneraciones/informe_horas.js")
const { calcularLibro } = require("../src/asistencia/libro_asistencia.js")
const { xmlDeHoja } = require("../src/shared/xlsx_minimo.js")

// Lunes a viernes 08:00–17:30, colación 60.
const dias = [1, 2, 3, 4, 5, 6, 7].map((dia) => ({ dia, trabaja: dia <= 5, entrada: "08:00", salida: "17:30", colacion: 60 }))
const marca = (fecha, extra) => ({ fecha, tipo: "normal", estado_aprobacion: "aprobada", recargo_hora_extra: 50, ...extra })
const libro = calcularLibro({
    anio: 2026, mes: 10, desde: "2026-01-01", tramosJornada: [{ desde: "0000-01-01", dias }],
    marcas: [
        marca("2026-10-05", { hora_salida: "19:00" }), // 1,5 h al 50 %
        marca("2026-10-06", { hora_salida: "19:30", recargo_hora_extra: 100 }), // 2 h al 100 %
        marca("2026-10-07", { hora_entrada: "08:20", tipo: "atraso" }), // 20 min
        marca("2026-10-08", { hora_entrada: "08:10", hora_salida: "17:40", tipo: "atraso" }), // compensado
        marca("2026-10-09", { hora_salida: "18:30", estado_aprobacion: "pendiente" }) // 1 h pendiente
    ]
})

test("repartir: la suma es exacta (resto mayor)", () => {
    assert.deepStrictEqual(repartir(100, [1, 1, 1]), [34, 33, 33])
    assert.deepStrictEqual(repartir(18750, [1.5, 1]), [11250, 7500])
    assert.deepStrictEqual(repartir(0, [1, 2]), [0, 0])
    assert.deepStrictEqual(repartir(10, [0, 0]), [0, 0])
})

test("sin liquidación: horas y minutos, sin montos", () => {
    const r = armarInformeHoras({ libro })
    assert.strictEqual(r.filas.length, 4, "el día compensado sin descuento no aparece")
    assert.deepStrictEqual(r.totales, { horas50: 1.5, horas100: 2, minutosAtraso: 20, monto50: null, monto100: null, montoAtraso: null })
    assert.strictEqual(r.filas.find((f) => f.fecha === "2026-10-09").aprobada, false)
    assert.ok(r.avisos.some((a) => /pendientes de aprobación/.test(a)))
    assert.ok(r.avisos.some((a) => /no está calculada/.test(a)))
})

test("con liquidación que cuadra: los montos por día suman lo pagado y descontado", () => {
    const liquidacion = { estado: "emitida", valorHora: 5000, lineas: { 50: { cantidad: 2.5, monto: 18750 }, 100: { cantidad: 2, monto: 20000 }, atraso: { cantidad: 20, monto: 1667 } } }
    const r = armarInformeHoras({ libro, pendientes: [{ recargo: 50, horas: 1, mesOrigen: "2026-09-01" }], liquidacion })
    const dia = (fecha) => r.filas.find((f) => f.fecha === fecha)
    assert.strictEqual(dia("2026-10-05").montoExtra, 11250)
    assert.strictEqual(dia("2026-10-06").montoExtra, 20000)
    assert.strictEqual(dia("2026-10-07").montoAtraso, 1667)
    assert.strictEqual(dia("2026-10-09").montoExtra, null, "la marca pendiente no recibe monto")
    assert.deepStrictEqual(r.anteriores, [{ recargo: 50, horas: 1, mesOrigen: "2026-09", monto: 7500 }])
    assert.deepStrictEqual(r.totales, { horas50: 2.5, horas100: 2, minutosAtraso: 20, monto50: 18750, monto100: 20000, montoAtraso: 1667 })
    assert.strictEqual(r.liquidacion.desactualizado, false)
})

test("si el libro cambió después de calcular, estima con el valor hora y avisa", () => {
    const liquidacion = { estado: "calculada", valorHora: 5000, lineas: { 50: { cantidad: 1, monto: 7500 }, 100: { cantidad: 2, monto: 20000 }, atraso: { cantidad: 0, monto: 0 } } }
    const r = armarInformeHoras({ libro, liquidacion })
    assert.strictEqual(r.filas.find((f) => f.fecha === "2026-10-05").montoExtra, 11250)
    assert.strictEqual(r.filas.find((f) => f.fecha === "2026-10-07").montoAtraso, 1667)
    assert.strictEqual(r.liquidacion.desactualizado, true)
    assert.ok(r.avisos.some((a) => /no cuadran/.test(a)))
})

test("líneas de la liquidación que usa el informe", () => {
    const lineas = [{ codigo: "HORAS_EXTRA_50", cantidad: "2.50", monto: 18750 }, { codigo: "DESCUENTO_ATRASOS", cantidad: "20", monto: 1667 }, { codigo: "SUELDO_BASE", cantidad: 30, monto: 840000 }]
    assert.deepStrictEqual(lineasDelInforme(lineas), { 50: { cantidad: 2.5, monto: 18750 }, 100: { cantidad: 0, monto: 0 }, atraso: { cantidad: 20, monto: 1667 } })
})

test("el Excel guarda los números como números", () => {
    const xml = xmlDeHoja({ filas: [["A", "B"], ["texto", 1.5]] })
    assert.match(xml, /<c r="B2"><v>1.5<\/v><\/c>/)
    assert.match(xml, /<c r="A2" t="inlineStr">/)
})

test("con anexo en el mes y horas de un mes anterior: cada parte pesa con su valor hora", () => {
    // Día 05 (antes del anexo, hora 4.000): 1,5 h → peso 6.000. Una hora de septiembre (hora 3.500) → peso 3.500.
    const liquidacion = {
        estado: "calculada", valorHora: 4500,
        valoresHora: { porTramo: [{ desdeDia: 1, valorHora: 4000 }, { desdeDia: 16, valorHora: 4500 }], horasExtra: [{ recargo: 50, mesOrigen: "2026-09", valorHora: 3500 }] },
        lineas: { 50: { cantidad: 2.5, monto: 15000 }, 100: { cantidad: 2, monto: 16000 }, atraso: { cantidad: 20, monto: 1333 } }
    }
    const r = armarInformeHoras({ libro, pendientes: [{ recargo: 50, horas: 1, mesOrigen: "2026-09-01" }], liquidacion })
    // El reparto es proporcional a horas × valor hora y suma exacto la línea.
    const dia = r.filas.find((f) => f.fecha === "2026-10-05")
    assert.strictEqual(dia.montoExtra + r.anteriores[0].monto, 15000)
    assert.strictEqual(dia.montoExtra, Math.round(15000 * 6000 / (6000 + 3500)))
})
