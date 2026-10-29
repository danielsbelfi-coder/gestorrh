const test = require("node:test")
const assert = require("node:assert/strict")
const { generarCodigos, normalizarCodigo, pareceCodigoRecuperacion, hashCodigo } = require("../src/auth/codigos_recuperacion.js")

test("genera 10 códigos xxxxx-xxxxx, sin repetidos ni caracteres ambiguos", () => {
    const codigos = generarCodigos()
    assert.equal(codigos.length, 10)
    assert.equal(new Set(codigos).size, 10)
    for (const codigo of codigos) {
        assert.match(codigo, /^[a-hjkmnp-z2-9]{5}-[a-hjkmnp-z2-9]{5}$/)
        assert.equal(/[01ilo]/.test(codigo), false, codigo)
    }
    assert.equal(generarCodigos(3).length, 3)
})

test("normaliza mayúsculas, guiones y espacios", () => {
    assert.equal(normalizarCodigo(" AB3DE-FG4HJ "), "ab3defg4hj")
    assert.equal(normalizarCodigo("ab3de fg4hj"), "ab3defg4hj")
    assert.equal(normalizarCodigo(undefined), "")
})

test("pareceCodigoRecuperacion distingue un código de recuperación de uno de la app", () => {
    assert.equal(pareceCodigoRecuperacion("ab3de-fg4hj"), true)
    assert.equal(pareceCodigoRecuperacion("AB3DE FG4HJ"), true)
    assert.equal(pareceCodigoRecuperacion("123456"), false)
    assert.equal(pareceCodigoRecuperacion("ab3de-fg4h"), false)
    assert.equal(pareceCodigoRecuperacion("ab3de-fg4h0"), false)
    assert.equal(pareceCodigoRecuperacion(null), false)
})

test("el hash es el mismo sin importar cómo se escriba el código", () => {
    const hash = hashCodigo("ab3de-fg4hj")
    assert.match(hash, /^[0-9a-f]{64}$/)
    assert.equal(hashCodigo("AB3DE FG4HJ"), hash)
    assert.notEqual(hashCodigo("ab3de-fg4hk"), hash)
})
