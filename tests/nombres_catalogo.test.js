const { test } = require("node:test")
const assert = require("node:assert")
const { claveDeNombre, buscarEnCatalogo } = require("../src/shared/nombres_catalogo.js")

const afps = ["AFP Capital", "AFP Cuprum", "AFP Habitat", "AFP Modelo", "AFP PlanVital", "AFP ProVida", "AFP Uno"]
    .map((nombre, i) => ({ id: i + 1, nombre, estado: "activo" }))
const isapres = ["Isapre Banmedica", "Isapre Colmena Golden Cross", "Isapre Consalud", "Isapre Cruz Blanca", "Isapre Nueva Masvida", "Isapre Vida Tres"]
    .map((nombre, i) => ({ id: i + 10, nombre, estado: "activo" }))

test("la clave ignora mayúsculas, tildes, espacios, puntuación y la palabra inicial", () => {
    assert.strictEqual(claveDeNombre("AFP ProVida"), "provida")
    assert.strictEqual(claveDeNombre("  Pro Vida "), "provida")
    assert.strictEqual(claveDeNombre("Banmédica"), "banmedica")
    assert.strictEqual(claveDeNombre("Isapre Cruz-Blanca"), "cruzblanca")
    assert.strictEqual(claveDeNombre("AFP"), "afp")
})

test("«Provida», «PROVIDA», «Pro Vida» y «AFP ProVida» son la misma AFP", () => {
    for (const texto of ["Provida", "PROVIDA", "Pro Vida", "AFP ProVida", "afp provida"]) {
        assert.strictEqual(buscarEnCatalogo(afps, texto).item.id, 6, texto)
    }
    assert.strictEqual(buscarEnCatalogo(afps, "Plan Vital").item.id, 5)
    assert.strictEqual(buscarEnCatalogo(afps, "Habitat").item.id, 3)
})

test("el nombre corto de una isapre encuentra el largo", () => {
    assert.strictEqual(buscarEnCatalogo(isapres, "Colmena").item.id, 11)
    assert.strictEqual(buscarEnCatalogo(isapres, "Mas Vida").item.id, 14)
    assert.strictEqual(buscarEnCatalogo(isapres, "Banmédica").item.id, 10)
    assert.strictEqual(buscarEnCatalogo(isapres, "Vida Tres").item.id, 15)
})

test("un texto que calza con varias es ambiguo y uno inexistente da null", () => {
    const ambiguo = buscarEnCatalogo(isapres, "Vida")
    assert.strictEqual(ambiguo.item, undefined)
    assert.deepStrictEqual(ambiguo.ambiguos.map((i) => i.nombre), ["Isapre Nueva Masvida", "Isapre Vida Tres"])
    assert.strictEqual(buscarEnCatalogo(afps, "Inventada"), null)
    assert.strictEqual(buscarEnCatalogo(afps, ""), null)
    assert.strictEqual(buscarEnCatalogo(afps, "uno").item.id, 7)
})

test("un nombre sin parecido suficiente (menos de 4 letras) no calza por contener", () => {
    assert.strictEqual(buscarEnCatalogo(isapres, "vid"), null)
})

test("las inactivas no se ofrecen", () => {
    const lista = [{ id: 1, nombre: "AFP Vieja", estado: "inactivo" }]
    assert.strictEqual(buscarEnCatalogo(lista, "vieja"), null)
})
