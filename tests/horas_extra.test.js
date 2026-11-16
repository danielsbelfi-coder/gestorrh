const test = require("node:test")
const assert = require("node:assert/strict")
const { leerMesOrigen, problemasOrigenHorasExtra, horasPorRecargo } = require("../src/remuneraciones/horas_extra.js")
const { calcularLineasBase } = require("../src/remuneraciones/calculo_lineas.js")

const noviembre = { anio: 2026, mes: 11 }
const HE50 = { codigo: "HORAS_EXTRA_50", nombre: "Horas extra 50%", tipo: "haber", recargo_hora_extra: 50, imponible: true, tributable: true, base_gratificacion: true }
const HE100 = { codigo: "HORAS_EXTRA_100", nombre: "Horas extra 100%", tipo: "haber", recargo_hora_extra: 100, imponible: true, tributable: true, base_gratificacion: true }
const BONO = { codigo: "BONO_PRODUCCION", nombre: "Bono de producción", tipo: "haber", recargo_hora_extra: null }

test("mes de origen: obligatorio, AAAA-MM y anterior al mes del periodo", () => {
    assert.equal(leerMesOrigen("2026-10", noviembre), "2026-10-01")
    assert.equal(leerMesOrigen("2025-12-15", noviembre), "2025-12-01")
    assert.throws(() => leerMesOrigen("", noviembre), /Indica el mes de origen/)
    assert.throws(() => leerMesOrigen(null, noviembre), /Indica el mes de origen/)
    assert.throws(() => leerMesOrigen("2026-13", noviembre), /formato AAAA-MM/)
    assert.throws(() => leerMesOrigen("octubre", noviembre), /formato AAAA-MM/)
    assert.throws(() => leerMesOrigen("2026-11", noviembre), /anterior al mes del periodo/)
    assert.throws(() => leerMesOrigen("2026-12", noviembre), /anterior al mes del periodo/)
})

// Caso Joaquín (octubre 2026): 3,5 h del libro + una variable manual de 3,5 h del mismo mes = 7 h pagadas.
test("un mismo mes NO puede sumar horas extra desde el libro y desde una variable", () => {
    const variables = [
        { concepto: HE50, cantidad: 3.5, fuente: "asistencia", mes_origen: null },
        { concepto: HE50, cantidad: 3.5, fuente: "manual", mes_origen: null }
    ]
    const problemas = problemasOrigenHorasExtra(variables, { anio: 2026, mes: 10 })
    assert.equal(problemas.length, 1)
    assert.match(problemas[0], /no indica el mes de origen/)

    const mismoMes = problemasOrigenHorasExtra([{ concepto: HE100, cantidad: 2, fuente: "manual", mes_origen: "2026-10-01" }], { anio: 2026, mes: 10 })
    assert.equal(mismoMes.length, 1)
    assert.match(mismoMes[0], /mismo mes del periodo/)

    const importada = problemasOrigenHorasExtra([{ concepto: HE50, cantidad: 1, fuente: "importacion", mes_origen: null }], { anio: 2026, mes: 10 })
    assert.equal(importada.length, 1)
})

test("libro del mes + horas pendientes de un mes cerrado: se aceptan y se pagan por separado", () => {
    const variables = [
        { concepto: HE50, cantidad: 3.5, fuente: "asistencia", mes_origen: null },
        { concepto: HE100, cantidad: 2, fuente: "asistencia", mes_origen: null },
        { concepto: HE50, cantidad: 1.5, fuente: "manual", mes_origen: "2026-09-01" },
        { concepto: BONO, monto: 50000, fuente: "manual", mes_origen: null }
    ]
    assert.deepEqual(problemasOrigenHorasExtra(variables, { anio: 2026, mes: 10 }), [])

    // Sueldo 840.000, 42 h: valor hora = 840.000 / 30 × 28 / 168 = 4.666,67.
    const { lineas } = calcularLineasBase({
        sueldoBase: 840000, horasSemanales: 42, diasPagados: 30, variables, minutosAtraso: 0, ingresoMinimoMensual: 529000,
        conceptos: { SUELDO_BASE: { codigo: "SUELDO_BASE", tipo: "haber" }, GRATIFICACION: { codigo: "GRATIFICACION", tipo: "haber" } }
    })
    const he50 = lineas.find((l) => l.concepto.codigo === "HORAS_EXTRA_50")
    const he100 = lineas.find((l) => l.concepto.codigo === "HORAS_EXTRA_100")
    assert.equal(he50.cantidad, 5)
    assert.equal(he50.monto, Math.round(5 * (840000 / 30 * 28 / 168) * 1.5))
    assert.equal(he100.cantidad, 2)
    assert.equal(he100.monto, Math.round(2 * (840000 / 30 * 28 / 168) * 2))
})

test("horasPorRecargo: minutos del libro a horas con 2 decimales", () => {
    assert.deepEqual(horasPorRecargo({ minutos_extra_50: 210, minutos_extra_100: 100 }), { 50: 3.5, 100: 1.67 })
    assert.deepEqual(horasPorRecargo({}), { 50: 0, 100: 0 })
})
