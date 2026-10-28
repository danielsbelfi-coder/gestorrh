const test = require("node:test")
const assert = require("node:assert/strict")
const bcrypt = require("bcrypt")
const { normalizarEmail, emailValido } = require("../src/shared/email.js")
const { generarPasswordLegible, generarPasswordInicial } = require("../src/shared/password.js")

test("el correo se limpia y pasa a minúsculas", () => {
    assert.equal(normalizarEmail("  Admin@Cliente.CL "), "admin@cliente.cl")
    assert.equal(normalizarEmail(undefined), "")
    assert.equal(normalizarEmail({}), "")
})

test("validación básica de correo", () => {
    assert.equal(emailValido("a@b.cl"), true)
    assert.equal(emailValido("sin-arroba"), false)
    assert.equal(emailValido("a@b"), false)
    assert.equal(emailValido("con espacio@b.cl"), false)
    assert.equal(emailValido(""), false)
    assert.equal(emailValido("a@" + "b".repeat(200) + ".cl"), false)
})

test("la contraseña inicial es legible: sin caracteres ambiguos, formato xxxx-xxxx-xxxx", () => {
    const vistas = new Set()
    for (let i = 0; i < 300; i++) {
        const p = generarPasswordLegible()
        assert.match(p, /^[A-HJ-NP-Za-km-z2-9]{4}(-[A-HJ-NP-Za-km-z2-9]{4}){2}$/)
        vistas.add(p)
    }
    assert.equal(vistas.size, 300)
})

test("el hash corresponde a la contraseña entregada", async () => {
    const { password, hash } = await generarPasswordInicial()
    assert.equal(await bcrypt.compare(password, hash), true)
    assert.equal(await bcrypt.compare(password + "x", hash), false)
})
