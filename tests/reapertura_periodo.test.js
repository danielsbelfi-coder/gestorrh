const test = require("node:test")
const assert = require("node:assert/strict")
const { validarMotivo, problemasDeReapertura } = require("../src/remuneraciones/reapertura_periodo.js")

const octubre = { mes: 10, anio: 2026, estado: "cerrado" }

test("el motivo se limpia y debe tener entre 10 y 500 caracteres", () => {
    assert.equal(validarMotivo("  Se olvidó un bono de producción  ").motivo, "Se olvidó un bono de producción")
    assert.ok(validarMotivo("corto").error)
    assert.ok(validarMotivo("          ").error)
    assert.ok(validarMotivo(undefined).error)
    assert.ok(validarMotivo({}).error)
    assert.ok(validarMotivo("x".repeat(501)).error)
    assert.equal(validarMotivo("x".repeat(500)).error, undefined)
})

test("el último periodo cerrado, sin meses siguientes, se puede reabrir", () => {
    assert.deepEqual(problemasDeReapertura({ periodo: octubre, posteriores: [] }), [])
    assert.deepEqual(problemasDeReapertura({ periodo: octubre, posteriores: [{ mes: 9, anio: 2026, estado: "cerrado", emitidas: 3 }] }), [])
})

test("un periodo abierto no se reabre", () => {
    assert.equal(problemasDeReapertura({ periodo: { ...octubre, estado: "abierto" }, posteriores: [] }).length, 1)
})

test("si un mes posterior está cerrado, no se puede", () => {
    const problemas = problemasDeReapertura({ periodo: octubre, posteriores: [{ mes: 11, anio: 2026, estado: "cerrado", emitidas: 2 }] })
    assert.equal(problemas.length, 1)
    assert.match(problemas[0], /11\/2026/)
})

test("si el mes siguiente está abierto pero con liquidaciones emitidas, no se puede", () => {
    const problemas = problemasDeReapertura({ periodo: octubre, posteriores: [{ mes: 11, anio: 2026, estado: "abierto", emitidas: 4 }] })
    assert.equal(problemas.length, 1)
    assert.match(problemas[0], /4 liquidaci/)
})

test("un mes siguiente abierto sin emitidas no bloquea; cruza el cambio de año", () => {
    assert.deepEqual(problemasDeReapertura({ periodo: octubre, posteriores: [{ mes: 11, anio: 2026, estado: "abierto", emitidas: 0 }] }), [])
    const diciembre = { mes: 12, anio: 2026, estado: "cerrado" }
    assert.equal(problemasDeReapertura({ periodo: diciembre, posteriores: [{ mes: 1, anio: 2027, estado: "abierto", emitidas: 1 }] }).length, 1)
})
