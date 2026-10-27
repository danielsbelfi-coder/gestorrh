const test = require("node:test")
const assert = require("node:assert")
const { tramoAsignacionFamiliar, lineaVacia, asignar, camposTrabajador, camposPrevision, camposEmpleador, lineasTrabajador } = require("../src/remuneraciones/archivo_previred.js")

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
    sexo: "femenino", nacionalidad: "chilena", anio: 2027, mes: 7, diasTrabajados: 27, tramo: "C", tipoCotizante: 0
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

const prevision = {
    codigoAfp: "08", rentaImponible: 1072299, afp: 123850, cuentaIndividual: 1072, sis: 19087,
    salud: { sistema: "Fonasa", legal: 75061 }
}

test("AFP y Fonasa: la cuenta individual va sumada en el 28 y la renta va en el 64", () => {
    const campos = asignar(lineaVacia(), camposPrevision(prevision))

    assert.deepStrictEqual(campos.slice(25, 29), ["08", 1072299, 124922, 19087])
    assert.strictEqual(campos[63], 1072299)
    assert.strictEqual(campos[69], 75061)
    assert.strictEqual(campos[74], "07")
    assert.strictEqual(campos[76], 0)
    assert.strictEqual(campos[77], 1)
})

test("isapre: renta en el 77, plan en UF con coma, legal y adicional; nada en Fonasa", () => {
    const campos = asignar(lineaVacia(), camposPrevision({
        ...prevision,
        salud: { sistema: "Isapre", codigoIsapre: "01", planUF: 4.5, legal: 75061, adicional: 109000 }
    }))

    assert.strictEqual(campos[63], 0)
    assert.strictEqual(campos[69], 0)
    assert.deepStrictEqual(campos.slice(74, 81), ["01", "", 1072299, 2, "4,5", 75061, 109000])
})

const empleador = {
    rentaImponible: 1072299, rima: 0, tipoJornada: "completa", expectativaVida: 7721, rentabilidadProtegida: 9651,
    mutual: { codigo: "01", monto: 20159 },
    cesantia: { base: 1072299, trabajador: 6434, empleador: 25735 },
    pagador: { rut: "61603000", dv: "0" }
}

test("mutual, jornada, reforma, cesantía y pagador", () => {
    const campos = asignar(lineaVacia(), camposEmpleador(empleador))

    assert.deepStrictEqual(campos.slice(91, 98), [0, 1, 7721, 9651, "01", 1072299, 20159])
    assert.deepStrictEqual(campos.slice(99, 104), [1072299, 6434, 25735, 61603000, "0"])
    assert.strictEqual(campos[70], 0)
})

test("ISL, plazo fijo, jornada parcial y sin licencia", () => {
    const campos = asignar(lineaVacia(), camposEmpleador({
        ...empleador,
        tipoJornada: "parcial",
        mutual: { codigo: "00", monto: 9973 },
        cesantia: { base: 1072299, trabajador: 0, empleador: 32169 },
        pagador: null
    }))

    assert.strictEqual(campos[63], 1072299)
    assert.strictEqual(campos[70], 9973)
    assert.deepStrictEqual(campos.slice(92, 98), [2, 7721, 9651, "00", 0, 0])
    assert.deepStrictEqual(campos.slice(99, 104), [1072299, 0, 32169, 0, ""])
})

test("sin seguro de cesantía: los campos 100 a 102 quedan en cero", () => {
    const campos = asignar(lineaVacia(), camposEmpleador({ ...empleador, cesantia: { base: 1072299, trabajador: 0, empleador: 0 } }))

    assert.deepStrictEqual(campos.slice(99, 102), [0, 0, 0])
})

test("una línea 00 con el primer movimiento y una 01 por cada movimiento siguiente", () => {
    const lineas = lineasTrabajador({
        trabajador: ana,
        prevision,
        empleador,
        movimientos: [
            { codigo: 11, desde: "2027-07-02", hasta: "2027-07-02" },
            { codigo: 3, desde: "2027-07-15", hasta: "2027-07-16" }
        ]
    })

    assert.strictEqual(lineas.length, 2)

    const principal = lineas[0].split(";")
    const adicional = lineas[1].split(";")

    assert.strictEqual(principal.length, 105)
    assert.strictEqual(adicional.length, 105)

    assert.deepStrictEqual(principal.slice(12, 17), ["27", "00", "11", "02-07-2027", "02-07-2027"])
    assert.strictEqual(principal[26], "1072299")

    assert.deepStrictEqual(adicional.slice(0, 3), ["88888888", "8", "Soto"])
    assert.deepStrictEqual(adicional.slice(12, 18), ["0", "01", "3", "15-07-2027", "16-07-2027", ""])
    assert.deepStrictEqual(adicional.slice(25, 29), ["08", "0", "0", "0"])
    assert.deepStrictEqual([adicional[74], adicional[92], adicional[93], adicional[95]], ["0", "1", "0", "01"])
    assert.strictEqual(adicional[102], "0")
})

test("tipo de cotizante: un pensionado que no cotiza va con 2 en el campo 12", () => {
    const campos = asignar(lineaVacia(), camposTrabajador({ ...ana, tipoCotizante: 2 }))

    assert.strictEqual(campos[11], 2)
})