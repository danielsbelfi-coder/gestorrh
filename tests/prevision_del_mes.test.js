const test = require("node:test")
const assert = require("node:assert/strict")
const p = require("../src/trabajadores/prevision_del_mes.js")

const filas = [
    { id: 1, desde: "1900-01-01", afp_id: 1 },
    { id: 2, desde: "2027-03-01", afp_id: 2 },
    { id: 3, desde: "2027-08-01", afp_id: 3 }
]

test("previsionDelMes: la vigente en el primer día del mes", () => {
    assert.equal(p.previsionDelMes(filas, 2026, 12).id, 1)
    assert.equal(p.previsionDelMes(filas, 2027, 2).id, 1)
    assert.equal(p.previsionDelMes(filas, 2027, 3).id, 2)
    assert.equal(p.previsionDelMes(filas, 2027, 7).id, 2)
    assert.equal(p.previsionDelMes(filas, 2027, 8).id, 3)
    assert.equal(p.previsionDelMes(filas, 2030, 1).id, 3)
    // El orden de las filas no importa.
    assert.equal(p.previsionDelMes([...filas].reverse(), 2027, 5).id, 2)
    assert.equal(p.previsionDelMes([], 2027, 5), null)
    assert.equal(p.previsionDelMes([{ id: 9, desde: "2027-06-01" }], 2027, 5), null)
})

test("desdeDeTexto: AAAA-MM o «siempre»", () => {
    assert.equal(p.desdeDeTexto("2027-03"), "2027-03-01")
    assert.equal(p.desdeDeTexto("siempre"), p.DESDE_SIEMPRE)
    for (const malo of ["2027-13", "2027-3", "03-2027", "", null, undefined, 202703]) {
        assert.equal(p.desdeDeTexto(malo), null, String(malo))
    }
})

test("validarPrevision: AFP y salud obligatorias; isapre con plan en UF", () => {
    assert.deepEqual(p.validarPrevision({ desde: "2027-03", afp_id: 2, sistema_salud: "Fonasa" }), [])
    assert.deepEqual(p.validarPrevision({ desde: "2027-03", afp_id: "2", sistema_salud: "Isapre", isapre_id: "4", plan_isapre_uf: "3,25" }), [])
    assert.equal(p.validarPrevision({ desde: "marzo", afp_id: 2, sistema_salud: "Fonasa" }).length, 1)
    assert.match(p.validarPrevision({ desde: "2027-03", sistema_salud: "Fonasa" })[0], /AFP/)
    assert.match(p.validarPrevision({ desde: "2027-03", afp_id: 2, sistema_salud: "otro" })[0], /Fonasa o Isapre/)
    assert.deepEqual(p.validarPrevision({ desde: "2027-03", afp_id: 2, sistema_salud: "Isapre", plan_isapre_uf: 0 }), ["Debe indicar la isapre", "El plan de isapre debe ser un número mayor que 0 (en UF)"])
})

test("normalizarPrevision: Fonasa sin isapre ni plan; plan con coma decimal", () => {
    assert.deepEqual(p.normalizarPrevision({ desde: "2027-03", afp_id: "2", sistema_salud: "Fonasa", isapre_id: 4, plan_isapre_uf: 3 }),
        { desde: "2027-03-01", afp_id: 2, sistema_salud: "Fonasa", isapre_id: null, plan_isapre_uf: null })
    assert.deepEqual(p.normalizarPrevision({ desde: "siempre", afp_id: 1, sistema_salud: "Isapre", isapre_id: "4", plan_isapre_uf: "3,25" }),
        { desde: "1900-01-01", afp_id: 1, sistema_salud: "Isapre", isapre_id: 4, plan_isapre_uf: 3.25 })
})

test("mesesCerradosAlcanzados: solo los meses cerrados desde el cambio en adelante", () => {
    const cerradas = [{ anio: 2027, mes: 1 }, { anio: 2027, mes: 2 }, { anio: 2027, mes: 2 }, { anio: 2026, mes: 12 }]
    assert.deepEqual(p.mesesCerradosAlcanzados("2027-02-01", cerradas), ["2027-02"])
    assert.deepEqual(p.mesesCerradosAlcanzados("2027-03-01", cerradas), [])
    assert.deepEqual(p.mesesCerradosAlcanzados(p.DESDE_SIEMPRE, cerradas), ["2026-12", "2027-01", "2027-02"])
})
