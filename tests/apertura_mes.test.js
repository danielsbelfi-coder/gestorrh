const test = require("node:test")
const assert = require("node:assert/strict")
const { CODIGOS_DEL_MES, parametrosACopiar, codigosSinCopiar } = require("../src/remuneraciones/apertura_mes.js")

const origen = [
    { codigo: "UF", valor: "41247.63" },
    { codigo: "UTM", valor: "70000" },
    { codigo: "TOPE_IMPONIBLE_UF", valor: "90" },
    { codigo: "TASA_SIS", valor: "1.54" }
]

test("abrir mes: la UF y la UTM nunca se copian (el mes queda incompleto hasta cargarlas)", () => {
    assert.deepEqual(CODIGOS_DEL_MES, ["UF", "UTM"])
    const copiados = parametrosACopiar(origen, new Set())
    assert.deepEqual(copiados.map((p) => p.codigo), ["TOPE_IMPONIBLE_UF", "TASA_SIS"])
})

test("abrir mes: no copia lo que el destino ya tiene", () => {
    const copiados = parametrosACopiar(origen, new Set(["TASA_SIS"]))
    assert.deepEqual(copiados.map((p) => p.codigo), ["TOPE_IMPONIBLE_UF"])
})

test("abrir mes: avisa qué falta cargar, y nada si el destino ya tiene la UF y la UTM", () => {
    assert.deepEqual(codigosSinCopiar(new Set()), ["UF", "UTM"])
    assert.deepEqual(codigosSinCopiar(new Set(["UF"])), ["UTM"])
    assert.deepEqual(codigosSinCopiar(new Set(["UF", "UTM"])), [])
})
