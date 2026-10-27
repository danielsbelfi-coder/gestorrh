const test = require("node:test")
const assert = require("node:assert")
const { columnasLre, encabezadoLre, lineaLre } = require("../src/remuneraciones/archivo_lre.js")

test("plantilla: 147 columnas con su código, sin repetidos, en el orden oficial", () => {
    const columnas = columnasLre()
    const codigos = columnas.map((columna) => columna.codigo)

    assert.strictEqual(columnas.length, 147)
    assert.strictEqual(new Set(codigos).size, 147)
    assert.strictEqual(codigos[0], 1101)
    assert.strictEqual(codigos[146], 5565)
    assert.strictEqual(columnas[1].nombre, "Fecha inicio contrato(1102)")
    assert.strictEqual(columnas[12].codigo, 1142)
    assert.strictEqual(columnas[64].nombre, "Sueldo empresarial (2161)")
    assert.strictEqual(columnas[104].codigo, 3166)
})

test("encabezado: las tildes se leen bien desde latin1", () => {
    assert.match(encabezadoLre(columnasLre()), /^Rut trabajador\(1101\);Fecha inicio contrato\(1102\);Fecha término de contrato\(1103\);/)
})

test("línea: cada valor en su columna, el 0 se escribe y lo demás queda vacío", () => {
    const columnas = columnasLre()
    const campos = lineaLre(columnas, { 1101: "88888888-8", 2101: 738000, 3144: 0 }).split(";")

    assert.strictEqual(campos.length, 147)
    assert.strictEqual(campos[0], "88888888-8")
    assert.strictEqual(campos[40], "738000")
    assert.strictEqual(campos[91], "0")
    assert.strictEqual(campos[1], "")
})