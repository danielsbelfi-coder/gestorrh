const { test } = require("node:test")
const assert = require("node:assert")
const { leerMes, validarCambiosPrevision } = require("../src/trabajadores/importacion_previsiones.js")

const inicial = { desde: "1900-01-01", regimen: "AFP", afp_id: 1, ex_caja_regimen_id: null, cotiza_desahucio: false, sistema_salud: "Isapre", isapre_id: 5, plan_isapre_uf: "3.5" }
function catalogos(previsiones = [inicial]) {
    return {
        afps: [{ id: 1, nombre: "Habitat", estado: "activo" }, { id: 2, nombre: "Capital", estado: "activo" }],
        isapres: [{ id: 5, nombre: "Colmena", estado: "activo" }],
        exCajas: [{ id: 85, caja: "Empart", regimen: 1, codigo_previred: "0101", codigo_desahucio: "0101" }],
        personas: new Map([["12345678", { id: 7, dv: "5", nombre: "Juan Pérez", previsiones }]])
    }
}
const fila = (c = {}) => ({ rut: "12.345.678", dv: "5", desde: "03-2027", afp: "", ex_caja: "", cotiza_desahucio: "", sistema_salud: "", isapre: "", plan_isapre_uf: "", ...c })

test("leerMes: mm-aaaa, aaaa-mm, fecha de Excel y «siempre»", () => {
    assert.strictEqual(leerMes("03-2027"), "2027-03")
    assert.strictEqual(leerMes("3/2027"), "2027-03")
    assert.strictEqual(leerMes("2027-03"), "2027-03")
    assert.strictEqual(leerMes("01-03-2027"), "2027-03")
    assert.strictEqual(leerMes("Siempre"), "siempre")
    assert.strictEqual(leerMes("13-2027"), null)
    assert.strictEqual(leerMes("marzo"), null)
})

test("pasar a EMPART manteniendo la isapre que regía", () => {
    const { cambios, errores } = validarCambiosPrevision([fila({ ex_caja: "Empart régimen 1" })], catalogos())
    assert.deepStrictEqual(errores, [])
    assert.deepStrictEqual(cambios[0].datos, { desde: "2027-03-01", regimen: "IPS", ex_caja_regimen_id: 85, cotiza_desahucio: true, afp_id: null, sistema_salud: "Isapre", isapre_id: 5, plan_isapre_uf: 3.5 })
    assert.strictEqual(cambios[0].persona_id, 7)
})

test("solo la salud: se mantiene la pensión; dos filas de la misma persona se encadenan", () => {
    const { cambios, errores } = validarCambiosPrevision([
        fila({ ex_caja: "0101", cotiza_desahucio: "no" }),
        fila({ desde: "05-2027", sistema_salud: "Fonasa" })
    ], catalogos())
    assert.deepStrictEqual(errores, [])
    assert.deepStrictEqual(cambios[1].datos, { desde: "2027-05-01", regimen: "IPS", ex_caja_regimen_id: 85, cotiza_desahucio: false, afp_id: null, sistema_salud: "Fonasa", isapre_id: null, plan_isapre_uf: null })
})

test("«siempre» corrige la inicial; AFP nueva", () => {
    const { cambios } = validarCambiosPrevision([fila({ desde: "siempre", afp: "capital" })], catalogos())
    assert.strictEqual(cambios[0].datos.desde, "1900-01-01")
    assert.strictEqual(cambios[0].datos.afp_id, 2)
    assert.strictEqual(cambios[0].datos.sistema_salud, "Isapre")
})

test("errores: RUT desconocido, DV, mes, nada que cambiar, AFP con ex-caja, repetido y mes ya registrado", () => {
    const cats = catalogos([inicial, { ...inicial, desde: "2027-04-01" }])
    const { cambios, errores } = validarCambiosPrevision([
        fila({ rut: "1.111.111", afp: "habitat" }),
        fila({ dv: "K", afp: "habitat" }),
        fila({ desde: "2027", afp: "habitat" }),
        fila({}),
        fila({ afp: "habitat", ex_caja: "Empart régimen 1" }),
        fila({ desde: "06-2027", afp: "capital" }),
        fila({ desde: "2027-06", sistema_salud: "Fonasa" }),
        fila({ desde: "04-2027", afp: "capital" }),
        fila({ desde: "07-2027", sistema_salud: "Isapre", isapre: "Colmena" })
    ], cats)
    assert.strictEqual(cambios.length, 1)
    const m = Object.fromEntries(errores.map((e) => [e.fila, e.motivos.join("; ")]))
    assert.match(m[2], /no hay una persona/)
    assert.match(m[3], /DV/)
    assert.match(m[4], /desde debe ser/)
    assert.match(m[5], /no cambia nada/)
    assert.match(m[6], /no lleva AFP/)
    assert.match(m[8], /repetido.*fila 7/)
    assert.match(m[9], /ya hay un cambio/)
    assert.match(m[10], /plan_isapre_uf/)
})

test("sin previsión que regía ese mes: exige pensión y salud completas", () => {
    const { errores } = validarCambiosPrevision([fila({ afp: "habitat" })], catalogos([]))
    assert.match(errores[0].motivos[0], /no tiene previsión registrada/)
    const completa = validarCambiosPrevision([fila({ afp: "habitat", sistema_salud: "Fonasa" })], catalogos([]))
    assert.deepStrictEqual(completa.errores, [])
})
