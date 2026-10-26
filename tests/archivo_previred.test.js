const test = require("node:test")
const assert = require("node:assert")
const { tramoAsignacionFamiliar, lineaVacia, asignar, camposTrabajador } = require("../src/remuneraciones/archivo_previred.js")

const limites = { a: 649039, b: 947990, c: 1478539 }

test("tramo de asignación familiar según la renta, con los límites incluidos", () => {
    assert.strictEqual(tramoAsignacionFamiliar(500000, limites), "A")
    assert.strictEqual(tramoAsignacionFamiliar(649039, limites), "A")
    assert.strictEqual(tramoAsignacionFamiliar(649040, limites), "B")
    assert.strictEqual(tramoAsignacionFamiliar(1072299, limites), "C")
    assert.strictEqual(tramoAsignacionFamiliar(1478539, limites), "C")
    assert.strictEqual(tramoAsignacionFamiliar(1478540, limites), "D")
})

test("línea vacía: 105 campos, texto en blanco, numéricos en 0 y rellenos con su formato", () => {
    const campos = lineaVacia()

    assert.strictEqual(campos.length, 105)
    assert.strictEqual(campos[0], 0)
    assert.strictEqual(campos[2], "")
    assert.strictEqual(campos[31], "00,00")
    assert.strictEqual(campos[61], "0000")
    assert.strictEqual(campos[104], "")
    assert.strictEqual(campos.join(";").split(";").length, 105)
})

const ana = {
    rut: "88888888", dv: "8", apellidoPaterno: "Soto", apellidoMaterno: null, nombres: "Ana",
    sexo: "femenino", nacionalidad: "chilena", anio: 2027, mes: 7, diasTrabajados: 27, tramo: "C"
}

test("datos del trabajador: identificación, periodo, días y tramo", () => {
    const campos = asignar(lineaVacia(), camposTrabajador(ana))

    assert.deepStrictEqual(campos.slice(0, 13), [88888888, "8", "Soto", "", "Ana", "F", 0, "01", "072027", 0, "AFP", 0, 27])
    assert.strictEqual(campos[17], "C")
    assert.strictEqual(campos[24], "N")
})

test("texto: sin punto y coma, sin espacios en los bordes y cortado a 30", () => {
    const campos = camposTrabajador({ ...ana, apellidoPaterno: "  Soto;Pérez ", nombres: "A".repeat(35), sexo: "masculino", nacionalidad: "extranjera" })

    assert.strictEqual(campos[3], "Soto Pérez")
    assert.strictEqual(campos[5].length, 30)
    assert.strictEqual(campos[6], "M")
    assert.strictEqual(campos[7], 1)
})