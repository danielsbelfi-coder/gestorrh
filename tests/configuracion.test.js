const test = require("node:test")
const assert = require("node:assert/strict")
const { validarConfiguracion, origenDeLaApp } = require("../src/shared/configuracion.js")

const buena = {
    NODE_ENV: "production", DB_NAME: "g", DB_USER: "u", DB_HOST: "h", DB_DIALECT: "postgres", DB_PASSWORD: "x",
    TRUST_PROXY: "1", DB_SSL: "true",
    TOTP_CLAVE_CIFRADO: "u6Hn0sQ3vW8xY1zA4bC7dE9fG2hJ5kL8mN0pQ3rS6tU", APP_ORIGEN: "https://gestorrh.onrender.com"
}

test("configuración correcta no da errores ni avisos", () => {
    assert.deepEqual(validarConfiguracion(buena), { errores: [], advertencias: [] })
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
    const base = { DB_NAME: "x", DB_USER: "x", DB_HOST: "db.ejemplo.cl", DB_DIALECT: "postgres", DB_PASSWORD: "x", TRUST_PROXY: "1", DB_SSL: "true", DB_SSL_VERIFICAR: "false" }
    assert.equal(opcionesSslBaseDatos(base).ssl.rejectUnauthorized, false)
    assert.ok(validarConfiguracion({ ...base, NODE_ENV: "development" }).advertencias.some((a) => a.includes("DB_SSL_VERIFICAR")))
    assert.ok(validarConfiguracion({ ...base, NODE_ENV: "production" }).errores.some((e) => e.includes("DB_SSL_VERIFICAR")))
})

test("avisa si la base remota en producción no usa SSL y si DB_SSL_CA apunta a un archivo inexistente", () => {
    const base = { DB_NAME: "x", DB_USER: "x", DB_HOST: "db.ejemplo.cl", DB_DIALECT: "postgres", DB_PASSWORD: "x", TRUST_PROXY: "1", NODE_ENV: "production" }
    assert.ok(validarConfiguracion({ ...base, DB_SSL: "false" }).advertencias.some((a) => a.includes("sin cifrar")))
    assert.ok(!validarConfiguracion({ ...base, DB_SSL: "false", DB_HOST: "localhost" }).advertencias.some((a) => a.includes("sin cifrar")))
    assert.ok(validarConfiguracion({ ...base, DB_SSL: "true", DB_SSL_CA: "no/existe.pem" }, () => false).errores.some((e) => e.includes("no existe")))
})

test("JWT_SECRET y JWT_EXPIRES_IN ya no se usan: su ausencia no es error", () => {
    assert.deepEqual(validarConfiguracion({ ...buena, JWT_SECRET: undefined, JWT_EXPIRES_IN: undefined }).errores, [])
})

test("TOTP_CLAVE_CIFRADO es obligatoria y debe ser de 32 bytes", () => {
    assert.match(validarConfiguracion({ ...buena, TOTP_CLAVE_CIFRADO: undefined }).errores[0], /32 bytes/)
    assert.match(validarConfiguracion({ ...buena, TOTP_CLAVE_CIFRADO: "corta" }).errores[0], /32 bytes/)
    // También en desarrollo: sin ella no se puede inscribir ni verificar el 2FA.
    assert.match(validarConfiguracion({ ...buena, NODE_ENV: "development", TOTP_CLAVE_CIFRADO: "" }).errores[0], /32 bytes/)
})

test("APP_ORIGEN: obligatoria y con https en producción, solo origen", () => {
    assert.match(validarConfiguracion({ ...buena, APP_ORIGEN: undefined }).errores[0], /Falta APP_ORIGEN/)
    assert.match(validarConfiguracion({ ...buena, APP_ORIGEN: "http://gestorrh.onrender.com" }).errores[0], /https/)
    assert.match(validarConfiguracion({ ...buena, APP_ORIGEN: "https://gestorrh.onrender.com/login" }).errores[0], /solo el origen/)
    assert.match(validarConfiguracion({ ...buena, APP_ORIGEN: "gestorrh.onrender.com" }).errores[0], /no es una dirección/)
    // Barra final se tolera.
    assert.deepEqual(validarConfiguracion({ ...buena, APP_ORIGEN: "https://gestorrh.onrender.com/" }).errores, [])
    // En desarrollo puede faltar, y http está permitido.
    const desarrollo = { ...buena, NODE_ENV: "development" }
    assert.deepEqual(validarConfiguracion({ ...desarrollo, APP_ORIGEN: undefined }).errores, [])
    assert.deepEqual(validarConfiguracion({ ...desarrollo, APP_ORIGEN: "http://localhost:3000" }).errores, [])
})

test("origenDeLaApp: el configurado, o localhost con el puerto en desarrollo", () => {
    assert.equal(origenDeLaApp({ APP_ORIGEN: "https://GestorRH.onrender.com/" }), "https://gestorrh.onrender.com")
    assert.equal(origenDeLaApp({ NODE_ENV: "development" }), "http://localhost:3000")
    assert.equal(origenDeLaApp({ NODE_ENV: "development", PORT: "4000" }), "http://localhost:4000")
    assert.equal(origenDeLaApp({ NODE_ENV: "production" }), "")
})
