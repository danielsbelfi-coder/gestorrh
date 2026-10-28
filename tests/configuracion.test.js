const test = require("node:test")
const assert = require("node:assert/strict")
const { validarConfiguracion, aHoras } = require("../src/shared/configuracion.js")

const buena = {
    NODE_ENV: "production", DB_NAME: "g", DB_USER: "u", DB_HOST: "h", DB_DIALECT: "postgres", DB_PASSWORD: "x",
    JWT_SECRET: "q8Zr2xLm9TgV4bNc7YdKp1WsE5hJu3AaFo6XiRt0BvCn8MlQ", JWT_EXPIRES_IN: "8h", TRUST_PROXY: "1"
}

test("configuración correcta no da errores ni avisos", () => {
    assert.deepEqual(validarConfiguracion(buena), { errores: [], advertencias: [] })
})

test("JWT_SECRET corta, vacía o de ejemplo es error", () => {
    assert.equal(validarConfiguracion({ ...buena, JWT_SECRET: "corta" }).errores.length, 1)
    assert.equal(validarConfiguracion({ ...buena, JWT_SECRET: undefined }).errores.length, 1)
    assert.equal(validarConfiguracion({ ...buena, JWT_SECRET: "mi_clave_secreta_" + "a".repeat(30) }).errores.length, 1)
})

test("sin JWT_EXPIRES_IN es error, formato inválido es error, más de 24 h es aviso", () => {
    assert.equal(validarConfiguracion({ ...buena, JWT_EXPIRES_IN: undefined }).errores.length, 1)
    assert.equal(validarConfiguracion({ ...buena, JWT_EXPIRES_IN: "mucho" }).errores.length, 1)
    assert.equal(validarConfiguracion({ ...buena, JWT_EXPIRES_IN: "0h" }).errores.length, 1)
    const larga = validarConfiguracion({ ...buena, JWT_EXPIRES_IN: "7d" })
    assert.equal(larga.errores.length, 0)
    assert.equal(larga.advertencias.length, 1)
})

test("aHoras entiende s, m, h, d y números de segundos", () => {
    assert.equal(aHoras("30m"), 0.5)
    assert.equal(aHoras("2h"), 2)
    assert.equal(aHoras("1d"), 24)
    assert.equal(aHoras("3600"), 1)
    assert.equal(aHoras("x"), null)
})

test("faltan variables de base de datos", () => {
    const { errores } = validarConfiguracion({ ...buena, DB_NAME: "", DB_HOST: undefined })
    assert.equal(errores.length, 2)
})

test("en producción exige contraseña de BD y avisa si falta TRUST_PROXY", () => {
    assert.equal(validarConfiguracion({ ...buena, DB_PASSWORD: "" }).errores.length, 1)
    assert.equal(validarConfiguracion({ ...buena, TRUST_PROXY: undefined }).advertencias.length, 1)
    assert.equal(validarConfiguracion({ ...buena, TRUST_PROXY: "abc" }).errores.length, 1)
    assert.equal(validarConfiguracion({ ...buena, TRUST_PROXY: "0" }).errores.length, 1)
})

test("fuera de producción avisa pero no falla", () => {
    const r = validarConfiguracion({ ...buena, NODE_ENV: "development", DB_PASSWORD: "", TRUST_PROXY: undefined })
    assert.equal(r.errores.length, 0)
    assert.equal(r.advertencias.length, 1)
})
