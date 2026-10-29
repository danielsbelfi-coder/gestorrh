const test = require("node:test")
const assert = require("node:assert/strict")
const { crearLimite2fa } = require("../src/auth/limite_2fa.js")
const { TooManyRequestsError } = require("../src/shared/errors.js")

const MIN = 60 * 1000
function reloj() {
    let t = 1_000_000
    return { ahora: () => t, avanzar: (ms) => { t += ms } }
}

test("5 códigos incorrectos bloquean 15 minutos a ese usuario", () => {
    const r = reloj()
    const lim = crearLimite2fa(r.ahora)
    for (let i = 0; i < 4; i++) {
        lim.exigirPermitido(7)
        assert.equal(lim.registrarFallo(7), false)
    }
    assert.equal(lim.registrarFallo(7), true)
    assert.throws(() => lim.exigirPermitido(7), (e) => {
        assert.ok(e instanceof TooManyRequestsError)
        assert.match(e.message, /15 minutos/)
        return true
    })
    // Otro usuario no se ve afectado.
    lim.exigirPermitido(8)
    r.avanzar(15 * MIN)
    lim.exigirPermitido(7)
})

test("un código correcto limpia los fallos", () => {
    const lim = crearLimite2fa(reloj().ahora)
    for (let i = 0; i < 4; i++) lim.registrarFallo(7)
    lim.registrarExito(7)
    assert.equal(lim.registrarFallo(7), false)
    lim.exigirPermitido(7)
})
