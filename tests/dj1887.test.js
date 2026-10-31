const test = require("node:test")
const assert = require("node:assert/strict")
const { codigoMes, horasDeContrato, problemasFactores, armarDj1887, lineaCsv, archivoDj1887 } = require("../src/remuneraciones/dj1887.js")

const factores = { 1: 1.05, 2: 1.04, 3: 1.04, 4: 1.03, 5: 1.03, 6: 1.02, 7: 1.02, 8: 1.02, 9: 1.01, 10: 1.01, 11: 1.0, 12: 1.0 }
const mes = (extra) => ({ bruto: 1000000, rentaNeta: 820000, impuesto: 12345, noGravada: 50000, imponible: 1000000, leyesSociales: 230000, jornada: "completa", termina: false, ...extra })

test("codigoMes: F en el término, A/B agrícola, C/P no agrícola", () => {
    assert.equal(codigoMes({ agricola: false, jornada: "completa", termina: false }), "C")
    assert.equal(codigoMes({ agricola: false, jornada: "parcial", termina: false }), "P")
    assert.equal(codigoMes({ agricola: false, jornada: "excluido_limitacion", termina: false }), "C")
    assert.equal(codigoMes({ agricola: true, jornada: "completa", termina: false }), "A")
    assert.equal(codigoMes({ agricola: true, jornada: "parcial", termina: false }), "B")
    assert.equal(codigoMes({ agricola: true, jornada: "parcial", termina: true }), "F")
})

test("horasDeContrato: horas pactadas o 99 sin limitación de jornada", () => {
    assert.equal(horasDeContrato({ tipo_jornada: "completa", horas_semanales: "42.00" }), 42)
    assert.equal(horasDeContrato({ tipo_jornada: "excluido_limitacion", horas_semanales: 45 }), 99)
    assert.equal(horasDeContrato(null), 99)
})

test("problemasFactores: los 12 meses, mayores que 0 y menores que 3", () => {
    assert.deepEqual(problemasFactores(factores), [])
    assert.deepEqual(problemasFactores({ ...factores, 3: undefined, 7: 0, 12: 3 }), [3, 7, 12])
    assert.equal(problemasFactores(null).length, 12)
})

test("armarDj1887: actualiza mes a mes, códigos, certificado por RUT y resumen", () => {
    const { filas, resumen } = armarDj1887({
        agricola: false,
        factores,
        personas: [
            { persona_id: 2, rut: "22333444", dv: "k", nombre: "Beto", horas: 42, meses: { 10: mes(), 11: mes({ termina: true, noGravada: 400000 }) } },
            { persona_id: 1, rut: "9876543", dv: "1", nombre: "Ana", horas: 30, meses: { 1: mes({ jornada: "parcial" }) } },
            { persona_id: 3, rut: "11111111", dv: "1", nombre: "Sin meses", horas: 42, meses: {} }
        ]
    })
    assert.equal(filas.length, 2)
    assert.deepEqual(filas.map((f) => [f.numero, f.certificado, f.rut, f.dv]), [[1, 1, "9876543", "1"], [2, 2, "22333444", "K"]])

    const ana = filas[0]
    assert.equal(ana.codigos[0], "P")
    assert.equal(ana.anual.rentaNeta, Math.round(820000 * 1.05))
    assert.equal(ana.anual.impuesto, Math.round(12345 * 1.05))
    assert.deepEqual(ana.mensual.slice(0, 2), [820000, null])
    assert.equal(ana.meses[0].cotizaciones, 180000)
    assert.equal(ana.meses[0].actualizado.noGravada, 52500)

    const beto = filas[1]
    assert.deepEqual(beto.codigos.slice(9), ["C", "F", ""])
    assert.equal(beto.anual.rentaNeta, Math.round(820000 * 1.01) + 820000)
    assert.equal(beto.anual.noGravada, Math.round(50000 * 1.01) + 400000)

    assert.equal(resumen.casos, 2)
    assert.equal(resumen.actualizados.rentaNeta, ana.anual.rentaNeta + beto.anual.rentaNeta)
    assert.equal(resumen.sinActualizar.rentaNeta, 820000 * 3)
    assert.equal(resumen.sinActualizar.impuesto, 12345 * 3)
    assert.equal(resumen.sinActualizar.leyesSociales, 230000 * 3)
    assert.equal(resumen.sinActualizar.impuestoAbril, 0)
    assert.equal(resumen.imponiblesActualizadas, 1050000 + 1010000 + 1000000)
})

test("lineaCsv: 35 columnas en el orden del Importador", () => {
    const { filas } = armarDj1887({ agricola: true, factores, personas: [{ persona_id: 1, rut: "9876543", dv: "k", nombre: "Ana", horas: 99, meses: { 12: mes() } }] })
    const columnas = lineaCsv(filas[0]).split(";")
    assert.equal(columnas.length, 35)
    assert.deepEqual(columnas.slice(0, 9), ["9876543", "K", "820000", "12345", "0", "50000", "0", "0", "0"])
    assert.deepEqual(columnas.slice(9, 21), ["", "", "", "", "", "", "", "", "", "", "", "A"])
    assert.equal(columnas[21], "1")
    assert.deepEqual(columnas.slice(22, 34), ["", "", "", "", "", "", "", "", "", "", "", "820000"])
    assert.equal(columnas[34], "99")
    assert.equal(archivoDj1887(filas), lineaCsv(filas[0]) + "\r\n")
})
