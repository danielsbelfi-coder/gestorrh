const test = require("node:test")
const assert = require("node:assert/strict")
const { erroresFechasContrato, errorVigenciaAnexo, errorTerminoAnexo, limiteHaciaAdelante, hoyEnChile } = require("../src/contratos/fechas_contrato.js")

const HOY = "2026-11-17"

test("el año mal digitado se rechaza: inicio más de un año después de hoy", () => {
    assert.match(erroresFechasContrato({ tipo_contrato: "indefinido", fecha_inicio: "2096-10-01" }, HOY)[0], /más de un año posterior a hoy: revisa el año/)
    assert.deepEqual(erroresFechasContrato({ tipo_contrato: "indefinido", fecha_inicio: "2027-11-17" }, HOY), [])
    assert.equal(limiteHaciaAdelante(HOY), "2027-11-17")
    assert.match(erroresFechasContrato({ fecha_inicio: "1926-10-01" }, HOY)[0], /anterior a 1950/)
    assert.match(erroresFechasContrato({ fecha_inicio: "2026-13-01" }, HOY)[0], /inválida/)
})

test("contratos antiguos se siguen aceptando (trabajadores con años de antigüedad)", () => {
    assert.deepEqual(erroresFechasContrato({ tipo_contrato: "indefinido", fecha_inicio: "2012-03-01" }, HOY), [])
})

test("fecha de término: no antes del inicio, plazo fijo hasta 2 años y tope de 5 años", () => {
    assert.match(erroresFechasContrato({ tipo_contrato: "plazo_fijo", fecha_inicio: "2026-10-01", fecha_termino: "2026-09-30" }, HOY)[0], /anterior a la de inicio/)
    assert.match(erroresFechasContrato({ tipo_contrato: "plazo_fijo", fecha_inicio: "2026-10-01", fecha_termino: "2096-12-31" }, HOY)[0], /máximo 2 años/)
    assert.deepEqual(erroresFechasContrato({ tipo_contrato: "plazo_fijo", fecha_inicio: "2026-10-01", fecha_termino: "2028-10-01" }, HOY), [])
    assert.match(erroresFechasContrato({ tipo_contrato: "obra_faena", fecha_inicio: "2026-10-01", fecha_termino: "2036-10-01" }, HOY)[0], /más de 5 años/)
})

test("anexos: vigencia desde el inicio del contrato y hasta un año después de hoy", () => {
    const contrato = { fecha_inicio: "2026-10-01" }
    assert.equal(errorVigenciaAnexo("2026-11-16", contrato, HOY), null)
    assert.match(errorVigenciaAnexo("2096-11-16", contrato, HOY), /revisa el año/)
    assert.match(errorVigenciaAnexo("2026-09-01", contrato, HOY), /antes del inicio/)
    assert.match(errorVigenciaAnexo(undefined, contrato, HOY), /Indica la fecha/)
    assert.equal(errorTerminoAnexo("2027-03-31", "2026-12-01", contrato), null)
    assert.match(errorTerminoAnexo("2097-03-31", "2026-12-01", contrato), /revisa el año/)
})

test("hoy en Chile", () => {
    assert.equal(hoyEnChile(new Date("2026-11-18T02:00:00Z")), "2026-11-17")
})

test("duración: el plazo fijo pide fecha de término y la obra o faena pide la obra, faena o hito (sin fecha)", () => {
    const { erroresDuracion } = require("../src/contratos/fechas_contrato.js")
    assert.deepStrictEqual(erroresDuracion({ tipo_contrato: "plazo_fijo", fecha_termino: "2027-04-30" }), { errores: [], obra: null })
    assert.match(erroresDuracion({ tipo_contrato: "plazo_fijo", fecha_termino: null }).errores[0], /necesita su fecha de término/)

    const hito = "  el término de las excavaciones y fundaciones del Edificio Los Robles "
    assert.deepStrictEqual(erroresDuracion({ tipo_contrato: "obra_faena", obra_faena_descripcion: hito }),
        { errores: [], obra: "el término de las excavaciones y fundaciones del Edificio Los Robles" })
    assert.match(erroresDuracion({ tipo_contrato: "obra_faena", obra_faena_descripcion: "   " }).errores[0], /obra, faena o hito/)
    assert.match(erroresDuracion({ tipo_contrato: "obra_faena", obra_faena_descripcion: hito, fecha_termino: "2027-06-30" }).errores[0], /no lleva fecha de término/)
    assert.match(erroresDuracion({ tipo_contrato: "obra_faena", obra_faena_descripcion: "x".repeat(256) }).errores[0], /255 caracteres/)

    // En otro tipo de contrato la descripción no se guarda.
    assert.strictEqual(erroresDuracion({ tipo_contrato: "indefinido", obra_faena_descripcion: "algo" }).obra, null)
})
