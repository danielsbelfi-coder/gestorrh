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

test("forma de pago: vacía = transferencia; acepta cheque sin importar mayúsculas ni tildes; rechaza lo desconocido", () => {
    const { personas, errores } = validarImportacion([
        fila(),
        fila({ rut: "9876543", dv: "3", forma_pago: "Cheque" }),
        fila({ rut: "7654321", dv: "6", forma_pago: " VALE  vista " }),
        fila({ rut: "6543210", dv: "2", forma_pago: "Efectivo" }),
        fila({ rut: "5432109", dv: "0", forma_pago: "paypal" })
    ], catalogos)
    assert.deepStrictEqual(personas.map((p) => p.persona.forma_pago), ["transferencia", "cheque", "vale_vista", "efectivo"])
    assert.strictEqual(errores.length, 1)
    assert.match(errores[0].motivos.join(" "), /forma_pago debe ser transferencia, cheque, efectivo o vale vista/)
})

test("«Cheque» escrito en tipo_cuenta: el error dice que va en forma_pago", () => {
    const { errores } = validarImportacion([fila({ tipo_cuenta: "Cheque" })], catalogos)
    assert.strictEqual(errores.length, 1)
    assert.match(errores[0].motivos.join(" "), /forma de pago: va en la columna forma_pago/)
})

test("caja antigua: ex_caja por nombre, abreviada o código Previred; sin AFP; desahucio vacío = sí", () => {
    const exCajas = [{ id: 85, caja: "Empart", regimen: 1, codigo_previred: "0101", codigo_desahucio: "0101" }, { id: 105, caja: "Servicio de Seguro Social", regimen: 1, codigo_previred: "0901", codigo_desahucio: null }]
    const conCajas = { ...catalogos, exCajas }
    const { personas, errores } = validarImportacion([
        fila({ afp: "", ex_caja: "Empart régimen 1" }),
        fila({ rut: "9.999.999", dv: "3", afp: "", ex_caja: "empart r1", cotiza_desahucio: "no" }),
        fila({ rut: "8.888.888", dv: "K", afp: "", ex_caja: "0901" }),
        fila({ rut: "7.777.777", dv: "6" })
    ], conCajas)
    assert.deepStrictEqual(errores, [])
    assert.deepStrictEqual(personas.map((p) => p.prevision), [
        { regimen: "IPS", ex_caja_regimen_id: 85, cotiza_desahucio: true },
        { regimen: "IPS", ex_caja_regimen_id: 85, cotiza_desahucio: false },
        { regimen: "IPS", ex_caja_regimen_id: 105, cotiza_desahucio: false },
        { regimen: "AFP", ex_caja_regimen_id: null, cotiza_desahucio: false }
    ])
    assert.strictEqual(personas[0].persona.afp_id, null)

    const malos = validarImportacion([
        fila({ ex_caja: "Empart régimen 1" }),
        fila({ rut: "9.999.999", dv: "3", afp: "", ex_caja: "Empart 9" }),
        fila({ rut: "8.888.888", dv: "K", cotiza_desahucio: "sí" })
    ], conCajas).errores
    assert.match(malos[0].motivos.join(), /no lleva AFP/)
    assert.match(malos[1].motivos.join(), /no existe/)
    assert.match(malos[2].motivos.join(), /junto con ex_caja/)
})
