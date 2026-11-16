const { test } = require("node:test")
const assert = require("node:assert")
const { crearXlsx, letraDeColumna } = require("../src/shared/xlsx_minimo.js")
const { generarPlantillaPersonas } = require("../src/trabajadores/plantilla_personas.js")
const { valoresValidos, validarImportacion, COLUMNAS } = require("../src/trabajadores/importacion_personas.js")

const catalogos = {
    afps: [{ id: 1, nombre: "AFP Habitat", estado: "activo" }, { id: 2, nombre: "AFP ProVida", estado: "activo" }],
    isapres: [{ id: 5, nombre: "Isapre Colmena Golden Cross", estado: "activo" }, { id: 6, nombre: "Isapre Consalud", estado: "activo" }],
    rutsExistentes: new Set()
}

function fila(cambios = {}) {
    return {
        rut: "12.345.678", dv: "5", nombres: "Juan", apellido_paterno: "Pérez", nacionalidad: "Chilena",
        fecha_nacimiento: "12-05-1990", direccion: "Calle 1", afp: "", sistema_salud: "fonasa", crear_postulante: "no", ...cambios
    }
}

test("letras de columna", () => {
    assert.strictEqual(letraDeColumna(0), "A")
    assert.strictEqual(letraDeColumna(25), "Z")
    assert.strictEqual(letraDeColumna(26), "AA")
    assert.strictEqual(letraDeColumna(22), "W")
})

test("el .xlsx es un zip con las partes del libro y una hoja por cada hoja pedida", async () => {
    const buffer = await crearXlsx([
        { nombre: "Uno", filas: [["a", "b"], ["1 & 2", "<x>"]] },
        { nombre: "Valores válidos", filas: [["c"]] }
    ])

    assert.strictEqual(buffer.subarray(0, 2).toString(), "PK")
    for (const parte of ["[Content_Types].xml", "xl/workbook.xml", "xl/styles.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"]) {
        assert.ok(buffer.includes(Buffer.from(parte)), parte)
    }
})

test("la plantilla de personas se genera con el catálogo", async () => {
    const buffer = await generarPlantillaPersonas(catalogos)
    assert.strictEqual(buffer.subarray(0, 2).toString(), "PK")
    assert.ok(buffer.length > 1500)
})

test("la guía trae los valores válidos de cada columna con lista", () => {
    const guia = Object.fromEntries(valoresValidos(catalogos).map((g) => [g.columna, g.valores]))

    assert.deepStrictEqual(guia.afp, ["AFP Habitat", "AFP ProVida"])
    assert.ok(guia.banco.includes("BancoEstado"))
    assert.ok(guia.tipo_cuenta.includes("cuenta Rut"))
    assert.deepStrictEqual(guia.forma_pago, ["transferencia", "cheque", "efectivo", "vale vista"])
    for (const columna of Object.keys(guia)) {
        assert.ok(COLUMNAS.includes(columna), columna)
    }
})

test("la importación acepta nombres cortos, otras mayúsculas y sinónimos", () => {
    const { personas, errores } = validarImportacion([
        fila({ afp: "provida", sistema_salud: "ISAPRE", isapre: "colmena", plan_isapre_uf: "3,5", forma_pago: "Vale-Vista", banco: "Banco Estado", tipo_cuenta: "Cta. Cte.", sexo: "Mujer", nacionalidad: "CHILENA" })
    ], catalogos)

    assert.deepStrictEqual(errores, [])
    const p = personas[0].persona
    assert.strictEqual(p.afp_id, 2)
    assert.strictEqual(p.isapre_id, 5)
    assert.strictEqual(p.forma_pago, "vale_vista")
    assert.strictEqual(p.tipo_cuenta, "cuenta corriente")
    assert.strictEqual(p.sexo_genero, "femenino")
    assert.strictEqual(p.banco_codigo, "012")
})

test("el error de un nombre que no existe lista los valores válidos", () => {
    const { errores } = validarImportacion([fila({ afp: "Inventada" })], catalogos)

    assert.match(errores[0].motivos[0], /la AFP "Inventada" no existe \(valores válidos: AFP Habitat, AFP ProVida\)/)
})

test("un nombre de isapre que calza con varias pide el nombre completo", () => {
    const { errores } = validarImportacion([fila({ sistema_salud: "Isapre", isapre: "Cons", plan_isapre_uf: "3" })], {
        ...catalogos,
        isapres: [{ id: 6, nombre: "Isapre Consalud", estado: "activo" }, { id: 7, nombre: "Isapre Consorcio", estado: "activo" }]
    })

    assert.match(errores[0].motivos[0], /es ambigua/)
})
