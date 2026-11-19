const { test } = require("node:test")
const assert = require("node:assert/strict")
const { revisarPlanilla, columnasDeEncabezado, leerRut, leerMonto } = require("../src/remuneraciones/importacion_variables.js")

const conceptos = [
    { id: 1, codigo: "ANTICIPO", nombre: "Anticipo", tipo: "descuento" },
    { id: 2, codigo: "VIATICO", nombre: "Viático", tipo: "haber" },
    { id: 3, codigo: "BONO_PRODUCCION", nombre: "Bono de producción", tipo: "haber" }
]
const relacionesPorRut = new Map([
    ["30143334", [{ id: 972, nombre: "Marcela Díaz", fecha_ingreso: "2021-06-01" }]],
    ["30144445", [{ id: 2, nombre: "Pedro Soto", fecha_ingreso: "2027-02-15" }, { id: 973, nombre: "Pedro Soto", fecha_ingreso: "2026-08-03" }]]
])

test("encabezado: RUT, conceptos por nombre, código o plural; las demás columnas se ignoran", () => {
    const { columnas, errores } = columnasDeEncabezado(["RUT", "Nombre", "Anticipos", "VIATICO", "Bono de Producción", "Cargo"], conceptos)
    assert.deepEqual(errores, [])
    assert.equal(columnas.rut, 0)
    assert.deepEqual(columnas.conceptos.map((c) => [c.indice, c.concepto.id]), [[2, 1], [3, 2], [4, 3]])
    assert.deepEqual(columnas.ignoradas, ["Nombre", "Cargo"])
    assert.match(columnasDeEncabezado(["Nombre", "Anticipo"], conceptos).errores[0], /RUT/)
    assert.match(columnasDeEncabezado(["RUT", "Nombre"], conceptos).errores[0], /Ninguna columna/)
    assert.match(columnasDeEncabezado(["RUT", "Anticipo", "ANTICIPO"], conceptos).errores[0], /mismo concepto/)
})

test("RUT con o sin puntos, guion o DV aparte; DV incorrecto", () => {
    assert.deepEqual(leerRut("30.143.334-4"), { rut: "30143334", dv: "4" })
    assert.deepEqual(leerRut("301433344"), { rut: "30143334", dv: "4" })
    assert.deepEqual(leerRut("30143334", "4"), { rut: "30143334", dv: "4" })
    assert.match(leerRut("30.143.334-5").error, /debería ser 4/)
})

test("montos en pesos: puntos de miles, signo $, coma decimal; vacío o 0 no carga", () => {
    assert.deepEqual(leerMonto("50.000"), { monto: 50000 })
    assert.deepEqual(leerMonto("$ 50.000"), { monto: 50000 })
    assert.deepEqual(leerMonto("50000"), { monto: 50000 })
    assert.deepEqual(leerMonto("50000,00"), { monto: 50000 })
    assert.deepEqual(leerMonto(""), { monto: null })
    assert.deepEqual(leerMonto("0"), { monto: null })
    assert.match(leerMonto("abc").error, /no válido/)
    assert.match(leerMonto("1500,5").error, /decimales/)
})

test("planilla con solo anticipos: carga solo eso", () => {
    const r = revisarPlanilla({
        matriz: [["RUT", "Nombre", "Anticipo"], ["30.143.334-4", "Marcela", "100.000"], ["30144445-1", "Pedro", ""], ["", "", ""]],
        conceptos, relacionesPorRut
    })
    assert.deepEqual(r.errores, [])
    assert.equal(r.filas, 2)
    assert.deepEqual(r.variables.map((v) => [v.trabajador_id, v.concepto_id, v.monto]), [[972, 1, 100000]])
})

test("dos conceptos, glosa, dos relaciones en el mes, errores y avisos", () => {
    const r = revisarPlanilla({
        matriz: [
            ["RUT", "Anticipo", "Viáticos", "Glosa"],
            ["30143334-4", "50000", "20.000", "Viaje a Santiago"],
            ["30144445-1", "", "15000", ""],
            ["11111111-1", "1000", "", ""],
            ["30143334-5", "1000", "", ""],
            ["30143334-4", "x", "", ""]
        ],
        conceptos, relacionesPorRut, existentes: new Set(["972-1"])
    })
    assert.deepEqual(r.variables.map((v) => [v.fila, v.trabajador_id, v.concepto_id, v.monto, v.glosa]), [
        [2, 972, 1, 50000, "Viaje a Santiago"], [2, 972, 2, 20000, "Viaje a Santiago"], [3, 2, 2, 15000, null]
    ])
    assert.deepEqual(r.errores.map((e) => e.fila), [4, 5, 6])
    assert.match(r.errores[0].motivos[0], /no tiene relación laboral/)
    assert.match(r.errores[1].motivos[0], /debería ser 4/)
    assert.match(r.errores[2].motivos[0], /Anticipo: monto «x» no válido/)
    assert.ok(r.avisos.some((a) => /ya tiene Anticipo/.test(a)))
    assert.ok(r.avisos.some((a) => /dos relaciones en el mes; se carga en la que empezó el 15-02-2027/.test(a)))
})
