const test = require("node:test")
const assert = require("node:assert/strict")
const { validarConfiguracion, aHoras } = require("../src/shared/configuracion.js")

const buena = {
    NODE_ENV: "production", DB_NAME: "g", DB_USER: "u", DB_HOST: "h", DB_DIALECT: "postgres", DB_PASSWORD: "x",
    JWT_SECRET: "q8Zr2xLm9TgV4bNc7YdKp1WsE5hJu3AaFo6XiRt0BvCn8MlQ", JWT_EXPIRES_IN: "8h", TRUST_PROXY: "1", DB_SSL: "true"
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

// ---------- SSL de la base de datos ----------
const { opcionesSslBaseDatos } = require("../src/shared/ssl_base_datos.js")

test("con DB_SSL=true se comprueba el certificado del servidor", () => {
    assert.deepEqual(opcionesSslBaseDatos({ DB_SSL: "true" }), { ssl: { rejectUnauthorized: true } })
    assert.deepEqual(opcionesSslBaseDatos({ DB_SSL: "true", DB_HOST: "ep-x.neon.tech" }), { ssl: { rejectUnauthorized: true, host: "ep-x.neon.tech" } })
    assert.deepEqual(opcionesSslBaseDatos({ DB_SSL: "false" }), {})
    assert.deepEqual(opcionesSslBaseDatos({}), {})
})

test("DB_SSL_CA acepta una ruta o el contenido del certificado", () => {
    const leer = (ruta) => `contenido de ${ruta}`
    assert.equal(opcionesSslBaseDatos({ DB_SSL: "true", DB_SSL_CA: "certs/rds.pem" }, leer).ssl.ca, "contenido de certs/rds.pem")
    const pegado = "-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----"
    assert.equal(opcionesSslBaseDatos({ DB_SSL: "true", DB_SSL_CA: pegado }, leer).ssl.ca, "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----")
})

test("desactivar la comprobación: aviso en desarrollo, error en producción", () => {
    const base = { DB_NAME: "x", DB_USER: "x", DB_HOST: "db.ejemplo.cl", DB_DIALECT: "postgres", DB_PASSWORD: "x", JWT_SECRET: "k".repeat(40), JWT_EXPIRES_IN: "8h", TRUST_PROXY: "1", DB_SSL: "true", DB_SSL_VERIFICAR: "false" }
    assert.equal(opcionesSslBaseDatos(base).ssl.rejectUnauthorized, false)
    assert.ok(validarConfiguracion({ ...base, NODE_ENV: "development" }).advertencias.some((a) => a.includes("DB_SSL_VERIFICAR")))
    assert.ok(validarConfiguracion({ ...base, NODE_ENV: "production" }).errores.some((e) => e.includes("DB_SSL_VERIFICAR")))
})

test("avisa si la base remota en producción no usa SSL y si DB_SSL_CA apunta a un archivo inexistente", () => {
    const base = { DB_NAME: "x", DB_USER: "x", DB_HOST: "db.ejemplo.cl", DB_DIALECT: "postgres", DB_PASSWORD: "x", JWT_SECRET: "k".repeat(40), JWT_EXPIRES_IN: "8h", TRUST_PROXY: "1", NODE_ENV: "production" }
    assert.ok(validarConfiguracion({ ...base, DB_SSL: "false" }).advertencias.some((a) => a.includes("sin cifrar")))
    assert.ok(!validarConfiguracion({ ...base, DB_SSL: "false", DB_HOST: "localhost" }).advertencias.some((a) => a.includes("sin cifrar")))
    assert.ok(validarConfiguracion({ ...base, DB_SSL: "true", DB_SSL_CA: "no/existe.pem" }, () => false).errores.some((e) => e.includes("no existe")))
})
