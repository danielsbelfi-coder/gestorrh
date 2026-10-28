const { test } = require("node:test")
const assert = require("node:assert")
const { validarImportacion, leerFecha, leerSiNo } = require("../src/trabajadores/importacion_personas.js")

const catalogos = {
    afps: [{ id: 1, nombre: "Habitat", estado: "activo" }, { id: 2, nombre: "Capital", estado: "activo" }],
    isapres: [{ id: 5, nombre: "Colmena", estado: "activo" }],
    rutsExistentes: new Set(["11111111"])
}

function fila(cambios = {}) {
    return {
        rut: "12.345.678", dv: "5", nombres: "Juan", apellido_paterno: "Pérez", nacionalidad: "Chilena",
        fecha_nacimiento: "12-05-1990", direccion: "Calle 1", afp: "habitat", sistema_salud: "fonasa",
        crear_postulante: "no", ...cambios
    }
}

test("leerFecha acepta dd-mm-aaaa, dd/mm/aaaa y aaaa-mm-dd", () => {
    assert.strictEqual(leerFecha("5-3-2026"), "2026-03-05")
    assert.strictEqual(leerFecha("05/03/2026"), "2026-03-05")
    assert.strictEqual(leerFecha("2026-03-05"), "2026-03-05")
    assert.strictEqual(leerFecha("31-02-2026"), null)
    assert.strictEqual(leerFecha("ayer"), null)
})

test("leerSiNo", () => {
    assert.strictEqual(leerSiNo("Sí"), true)
    assert.strictEqual(leerSiNo(""), false)
    assert.strictEqual(leerSiNo("quizás"), null)
})

test("fila válida: normaliza RUT, nacionalidad, fecha y AFP", () => {
    const { personas, errores } = validarImportacion([fila()], catalogos)
    assert.strictEqual(errores.length, 0)
    const p = personas[0].persona
    assert.strictEqual(p.rut, "12345678")
    assert.strictEqual(p.nacionalidad, "chilena")
    assert.strictEqual(p.fecha_nacimiento, "1990-05-12")
    assert.strictEqual(p.afp_id, 1)
    assert.strictEqual(p.sistema_salud, "Fonasa")
    assert.strictEqual(personas[0].postulante, null)
})

test("crear postulante exige fecha de ingreso", () => {
    const sinFecha = validarImportacion([fila({ crear_postulante: "si" })], catalogos)
    assert.strictEqual(sinFecha.errores.length, 1)
    const conFecha = validarImportacion([fila({ crear_postulante: "si", fecha_ingreso: "01-11-2026" })], catalogos)
    assert.deepStrictEqual(conFecha.personas[0].postulante, { fecha_ingreso: "2026-11-01" })
})

test("isapre exige nombre existente y plan en UF", () => {
    const { errores, personas } = validarImportacion([
        fila({ sistema_salud: "Isapre", isapre: "colmena", plan_isapre_uf: "3,5" }),
        fila({ rut: "9876543", dv: "3", sistema_salud: "Isapre", isapre: "Inventada" })
    ], catalogos)
    assert.strictEqual(personas[0].persona.isapre_id, 5)
    assert.strictEqual(personas[0].persona.plan_isapre_uf, 3.5)
    assert.strictEqual(errores.length, 1)
    assert.strictEqual(errores[0].fila, 3)
    assert.strictEqual(errores[0].motivos.length, 2)
})

test("detecta RUT inválido, repetido en la planilla y ya existente", () => {
    const { errores } = validarImportacion([
        fila(),
        fila({ dv: "1" }),
        fila(),
        fila({ rut: "11111111", dv: "1" })
    ], catalogos)
    assert.deepStrictEqual(errores.map((e) => e.fila), [3, 4, 5])
    assert.match(errores[0].motivos.join(), /RUT inválido/)
    assert.match(errores[1].motivos.join(), /repetido en la planilla \(fila 2\)/)
    assert.match(errores[2].motivos.join(), /ya existe/)
})

test("informa todos los campos obligatorios que faltan", () => {
    const { errores } = validarImportacion([{ rut: "", dv: "" }], catalogos)
    assert.strictEqual(errores[0].motivos.length, 7)
})
