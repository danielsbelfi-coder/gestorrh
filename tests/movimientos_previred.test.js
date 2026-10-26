const test = require("node:test")
const assert = require("node:assert")
const { movimientosDelMes } = require("../src/remuneraciones/movimientos_previred.js")

const base = {
    anio: 2027, mes: 7, fechaIngreso: "2020-03-01", fechaTermino: null, tipoContrato: "indefinido",
    licencias: [], fechasInasistencia: [], fechasPermisoSinGoce: []
}

test("mes sin novedades: un solo movimiento 0", () => {
    assert.deepStrictEqual(movimientosDelMes(base), [{ codigo: 0, desde: null, hasta: null }])
})

test("ingreso en el mes: 1 si es indefinido, 7 si es plazo fijo u obra", () => {
    assert.deepStrictEqual(movimientosDelMes({ ...base, fechaIngreso: "2027-07-09" }), [{ codigo: 1, desde: "2027-07-09", hasta: null }])
    assert.strictEqual(movimientosDelMes({ ...base, fechaIngreso: "2027-07-09", tipoContrato: "plazo_fijo" })[0].codigo, 7)
    assert.strictEqual(movimientosDelMes({ ...base, fechaIngreso: "2027-07-09", tipoContrato: "obra_faena" })[0].codigo, 7)
})

test("retiro en el mes: código 2 solo con fecha hasta", () => {
    assert.deepStrictEqual(movimientosDelMes({ ...base, fechaTermino: "2027-07-15" }), [{ codigo: 2, desde: null, hasta: "2027-07-15" }])
})

test("licencias: la que viene de junio parte el 1; la de accidente es 6; la que sigue en agosto conserva su término", () => {
    const licencias = [
        { tipo: "comun", fecha_inicio: "2027-06-20", fecha_termino: "2027-07-03" },
        { tipo: "accidente_trabajo", fecha_inicio: "2027-07-25", fecha_termino: "2027-08-10" }
    ]
    assert.deepStrictEqual(movimientosDelMes({ ...base, licencias }), [
        { codigo: 3, desde: "2027-07-01", hasta: "2027-07-03" },
        { codigo: 6, desde: "2027-07-25", hasta: "2027-08-10" }
    ])
})

test("inasistencias y permisos: un movimiento por tramo, todo ordenado por fecha", () => {
    const movimientos = movimientosDelMes({
        ...base,
        licencias: [{ tipo: "comun", fecha_inicio: "2027-07-15", fecha_termino: "2027-07-16" }],
        fechasInasistencia: ["2027-07-05", "2027-07-02"],
        fechasPermisoSinGoce: ["2027-07-07", "2027-07-06"]
    })
    assert.deepStrictEqual(movimientos, [
        { codigo: 11, desde: "2027-07-02", hasta: "2027-07-02" },
        { codigo: 11, desde: "2027-07-05", hasta: "2027-07-05" },
        { codigo: 4, desde: "2027-07-06", hasta: "2027-07-07" },
        { codigo: 3, desde: "2027-07-15", hasta: "2027-07-16" }
    ])
})