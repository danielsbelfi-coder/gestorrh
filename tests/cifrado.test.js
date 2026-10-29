const test = require("node:test")
const assert = require("node:assert/strict")
const crypto = require("crypto")
const { leerClave, cifrar, descifrar } = require("../src/auth/cifrado.js")

const clave = crypto.randomBytes(32)

test("cifrar y descifrar vuelven al texto original", () => {
    const cifrado = cifrar("JBSWY3DPEHPK3PXP", clave, "usuario:15")
    assert.match(cifrado, /^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
    assert.equal(cifrado.includes("JBSWY3DPEHPK3PXP"), false)
    assert.equal(descifrar(cifrado, clave, "usuario:15"), "JBSWY3DPEHPK3PXP")
})

test("el mismo texto cifrado dos veces da resultados distintos (IV al azar)", () => {
    assert.notEqual(cifrar("abc", clave), cifrar("abc", clave))
})

test("un dato alterado, otra clave u otro contexto no se descifran", () => {
    const cifrado = cifrar("secreto", clave, "usuario:15")
    const partes = cifrado.split(":")
    const datos = Buffer.from(partes[3], "base64url")
    datos[0] ^= 1
    const alterado = [partes[0], partes[1], partes[2], datos.toString("base64url")].join(":")

    assert.throws(() => descifrar(alterado, clave, "usuario:15"), /No se pudo descifrar/)
    assert.throws(() => descifrar(cifrado, crypto.randomBytes(32), "usuario:15"), /No se pudo descifrar/)
    // Copiado a otro usuario en la base: no sirve.
    assert.throws(() => descifrar(cifrado, clave, "usuario:16"), /No se pudo descifrar/)
})

test("formatos desconocidos se rechazan con el mismo error", () => {
    for (const malo of ["", null, "v2:a:b:c", "v1:a:b", "texto plano", "v1:AAAA:BBBB:CCCC"]) {
        assert.throws(() => descifrar(malo, clave), /No se pudo descifrar/, String(malo))
    }
})

test("leerClave exige 32 bytes en base64url", () => {
    const valida = crypto.randomBytes(32).toString("base64url")
    assert.equal(leerClave(valida).length, 32)
    assert.equal(leerClave(` ${valida} `).length, 32)
    for (const mala of ["", undefined, "corta", crypto.randomBytes(16).toString("base64url"), crypto.randomBytes(48).toString("base64url"), "con espacios y ñ"]) {
        assert.throws(() => leerClave(mala), /32 bytes/, String(mala))
    }
})
