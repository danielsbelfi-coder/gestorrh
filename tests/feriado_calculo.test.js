const test = require("node:test")
const assert = require("node:assert")
const { validarFeriado, feriadosAplicables, feriadoDelDia, regionDeComuna } = require("../src/calendario/feriado_calculo.js")

const LISTA = [
    { fecha: "2027-01-01", nombre: "Año Nuevo", alcance: "nacional", region: null, comuna: null },
    { fecha: "2027-06-07", nombre: "Toma del Morro de Arica", alcance: "regional", region: 15, comuna: null },
    { fecha: "2027-08-20", nombre: "Natalicio de O'Higgins", alcance: "comunal", region: null, comuna: "8401" }
]

test("región de una comuna", () => {
    assert.strictEqual(regionDeComuna("13101"), 13)
    assert.strictEqual(regionDeComuna("8401"), 16)
    assert.strictEqual(regionDeComuna("99999"), null)
})

test("feriado nacional válido", () => {
    const { datos, errores } = validarFeriado({ fecha: "2027-01-01", nombre: " Año Nuevo ", alcance: "nacional", region: 5, irrenunciable: true })
    assert.deepStrictEqual(errores, [])
    assert.strictEqual(datos.nombre, "Año Nuevo")
    assert.strictEqual(datos.region, null)
    assert.strictEqual(datos.irrenunciable, true)
})

test("rechaza fecha inválida, nombre corto y alcance desconocido", () => {
    assert.strictEqual(validarFeriado({ fecha: "2027-02-30", nombre: "Feriado", alcance: "nacional" }).errores.length, 1)
    assert.strictEqual(validarFeriado({ fecha: "2027-02-10", nombre: "ab", alcance: "nacional" }).errores.length, 1)
    assert.ok(validarFeriado({ fecha: "2027-02-10", nombre: "Feriado", alcance: "mundial" }).errores.length > 0)
})

test("regional exige región 1 a 16; comunal exige comuna de la tabla", () => {
    assert.ok(validarFeriado({ fecha: "2027-06-07", nombre: "Morro", alcance: "regional" }).errores.length > 0)
    assert.ok(validarFeriado({ fecha: "2027-06-07", nombre: "Morro", alcance: "regional", region: 17 }).errores.length > 0)
    assert.deepStrictEqual(validarFeriado({ fecha: "2027-06-07", nombre: "Morro", alcance: "regional", region: "15" }).errores, [])
    assert.ok(validarFeriado({ fecha: "2027-08-20", nombre: "Natalicio", alcance: "comunal", comuna: "00000" }).errores.length > 0)
    assert.deepStrictEqual(validarFeriado({ fecha: "2027-08-20", nombre: "Natalicio", alcance: "comunal", comuna: "8401" }).errores, [])
})

test("sin comuna solo rigen los nacionales", () => {
    assert.deepStrictEqual(feriadosAplicables(LISTA, null).map((f) => f.fecha), ["2027-01-01"])
})

test("Arica tiene el feriado regional; Santiago no", () => {
    assert.strictEqual(feriadoDelDia(LISTA, "2027-06-07", "15101")?.nombre, "Toma del Morro de Arica")
    assert.strictEqual(feriadoDelDia(LISTA, "2027-06-07", "13101"), null)
})

test("el feriado comunal rige solo en esa comuna (Chillán sí, Chillán Viejo no)", () => {
    assert.ok(feriadoDelDia(LISTA, "2027-08-20", "8401"))
    assert.strictEqual(feriadoDelDia(LISTA, "2027-08-20", "8406"), null)
})
