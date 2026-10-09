const test = require("node:test")
const assert = require("node:assert")
const { limpiarRut, calcularDv, rutEsValido } = require("../src/shared/rut.js")

test("limpiarRut quita puntos y el digito verificador", () => {
    assert.strictEqual(limpiarRut("12.345.678-5"), "12345678")
})

test("limpiarRut quita espacios", () => {
    assert.strictEqual(limpiarRut(" 9999999"), "9999999")
})

test("calcularDV calcula el digito verificador del Rut", () => {
    assert.strictEqual(calcularDv("10000013"), "K")
    assert.strictEqual(calcularDv("10000004"), "0")
    assert.strictEqual(calcularDv("12345678"), "5")
    assert.strictEqual(calcularDv("9999999"), "3")
    assert.strictEqual(calcularDv("11111111"), "1")
})

test("rutEsValido verifica que el Rut sea valido", () => {
    assert.strictEqual(rutEsValido("9999999", "3"), true)
    assert.strictEqual(rutEsValido("9999999", "5"), false)
    assert.strictEqual(rutEsValido("9999", "5"), false)
})