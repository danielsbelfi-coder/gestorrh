const test = require("node:test")
const assert = require("node:assert/strict")
const {
    base32Codificar, base32Decodificar, generarSecreto, pasoDe, codigoEnPaso,
    verificarTotp, uriOtpauth, agruparSecreto
} = require("../src/auth/totp.js")

// Secreto de los vectores de prueba del RFC 6238 (el texto ASCII "12345678901234567890") en base32.
const SECRETO_RFC = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
const segundos = (s) => s * 1000

test("base32: codifica el secreto del RFC y vuelve al original", () => {
    assert.equal(base32Codificar(Buffer.from("12345678901234567890")), SECRETO_RFC)
    assert.equal(base32Decodificar(SECRETO_RFC).toString(), "12345678901234567890")
    // Vectores del RFC 4648 (sin relleno).
    assert.equal(base32Codificar(Buffer.from("f")), "MY")
    assert.equal(base32Codificar(Buffer.from("foobar")), "MZXW6YTBOI")
    // Acepta minúsculas, espacios y relleno.
    assert.equal(base32Decodificar("mzxw 6ytb oi======").toString(), "foobar")
    assert.throws(() => base32Decodificar("ABC1"), /base32/)
})

test("vectores del RFC 6238 (SHA-1, últimos 6 dígitos)", () => {
    const casos = [
        [59, "287082"],
        [1111111109, "081804"],
        [1111111111, "050471"],
        [1234567890, "005924"],
        [2000000000, "279037"],
        [20000000000, "353130"]
    ]
    for (const [t, esperado] of casos) {
        assert.equal(codigoEnPaso(SECRETO_RFC, pasoDe(segundos(t))), esperado, `t=${t}`)
    }
})

test("generarSecreto: 20 bytes al azar en base32, distintos cada vez", () => {
    const a = generarSecreto()
    const b = generarSecreto()
    assert.match(a, /^[A-Z2-7]{32}$/)
    assert.equal(base32Decodificar(a).length, 20)
    assert.notEqual(a, b)
})

test("verificarTotp: acepta el código actual y devuelve su paso", () => {
    const ahora = segundos(1111111111)
    const paso = pasoDe(ahora)
    const resultado = verificarTotp(SECRETO_RFC, "050471", ahora)
    assert.deepEqual(resultado, { valido: true, paso })
    // Con espacios, como lo escribiría alguien leyendo la app.
    assert.equal(verificarTotp(SECRETO_RFC, "050 471", ahora).valido, true)
})

test("verificarTotp: tolera un intervalo antes y uno después, no dos", () => {
    const ahora = segundos(1111111111)
    const paso = pasoDe(ahora)
    assert.equal(verificarTotp(SECRETO_RFC, codigoEnPaso(SECRETO_RFC, paso - 1), ahora).valido, true)
    assert.equal(verificarTotp(SECRETO_RFC, codigoEnPaso(SECRETO_RFC, paso + 1), ahora).valido, true)
    assert.equal(verificarTotp(SECRETO_RFC, codigoEnPaso(SECRETO_RFC, paso - 2), ahora).valido, false)
    assert.equal(verificarTotp(SECRETO_RFC, codigoEnPaso(SECRETO_RFC, paso + 2), ahora).valido, false)
})

test("verificarTotp: un código ya usado no sirve otra vez (ni uno anterior)", () => {
    const ahora = segundos(1111111111)
    const { paso } = verificarTotp(SECRETO_RFC, "050471", ahora)
    // Segundo uso del mismo código, unos segundos después.
    assert.equal(verificarTotp(SECRETO_RFC, "050471", ahora + 5000, paso).valido, false)
    // El del intervalo anterior tampoco, porque es más viejo que el último usado.
    assert.equal(verificarTotp(SECRETO_RFC, codigoEnPaso(SECRETO_RFC, paso - 1), ahora, paso).valido, false)
    // El siguiente sí. El último paso puede venir como texto (PostgreSQL entrega BIGINT como texto).
    assert.equal(verificarTotp(SECRETO_RFC, codigoEnPaso(SECRETO_RFC, paso + 1), ahora, String(paso)).valido, true)
})

test("verificarTotp: rechaza formatos inválidos sin lanzar error", () => {
    const ahora = segundos(59)
    for (const malo of ["", "12345", "1234567", "abcdef", null, undefined, 287082.5, { a: 1 }]) {
        assert.deepEqual(verificarTotp(SECRETO_RFC, malo, ahora), { valido: false, paso: null }, String(malo))
    }
    // Si llega como número (sin comillas) y tiene 6 dígitos, también sirve.
    assert.equal(verificarTotp(SECRETO_RFC, 287082, ahora).valido, true)
})

test("uriOtpauth y agruparSecreto", () => {
    const uri = uriOtpauth("ana@cliente.cl", "JBSWY3DPEHPK3PXP")
    assert.ok(uri.startsWith("otpauth://totp/GestorRH:ana%40cliente.cl?"))
    const parametros = new URL(uri).searchParams
    assert.equal(parametros.get("secret"), "JBSWY3DPEHPK3PXP")
    assert.equal(parametros.get("issuer"), "GestorRH")
    assert.equal(parametros.get("digits"), "6")
    assert.equal(parametros.get("period"), "30")
    assert.equal(agruparSecreto("JBSWY3DPEHPK3PXP"), "JBSW Y3DP EHPK 3PXP")
})
