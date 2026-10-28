const test = require("node:test")
const assert = require("node:assert/strict")
const { LimitadorIntentos } = require("../src/auth/limitador_intentos.js")
const { crearLimiteLogin } = require("../src/auth/limite_login.js")
const { TooManyRequestsError } = require("../src/shared/errors.js")

function reloj() {
    let t = 1_000_000
    return { ahora: () => t, avanzar: (ms) => { t += ms } }
}
const MIN = 60 * 1000

test("limitador bloquea al llegar al máximo y libera al pasar el bloqueo", () => {
    const r = reloj()
    const l = new LimitadorIntentos({ maxIntentos: 3, ventanaMs: 15 * MIN, bloqueoMs: 10 * MIN, ahora: r.ahora })
    l.registrarFallo("a"); l.registrarFallo("a")
    assert.equal(l.bloqueadoPorMs("a"), 0)
    l.registrarFallo("a")
    assert.equal(l.bloqueadoPorMs("a"), 10 * MIN)
    r.avanzar(4 * MIN)
    assert.equal(l.bloqueadoPorMs("a"), 6 * MIN)
    r.avanzar(6 * MIN)
    assert.equal(l.bloqueadoPorMs("a"), 0)
})

test("los fallos fuera de la ventana no se acumulan", () => {
    const r = reloj()
    const l = new LimitadorIntentos({ maxIntentos: 3, ventanaMs: 15 * MIN, bloqueoMs: 10 * MIN, ahora: r.ahora })
    l.registrarFallo("a"); l.registrarFallo("a")
    r.avanzar(16 * MIN)
    l.registrarFallo("a")
    assert.equal(l.bloqueadoPorMs("a"), 0)
})

test("un acierto reinicia el contador y las claves son independientes", () => {
    const l = new LimitadorIntentos({ maxIntentos: 2, ventanaMs: 15 * MIN, bloqueoMs: 10 * MIN })
    l.registrarFallo("a"); l.reiniciar("a"); l.registrarFallo("a")
    assert.equal(l.bloqueadoPorMs("a"), 0)
    l.registrarFallo("b"); l.registrarFallo("b")
    assert.ok(l.bloqueadoPorMs("b") > 0)
    assert.equal(l.bloqueadoPorMs("a"), 0)
})

test("el mapa no crece sin límite", () => {
    const l = new LimitadorIntentos({ maxIntentos: 5, ventanaMs: 15 * MIN, bloqueoMs: 15 * MIN, maxClaves: 50 })
    for (let i = 0; i < 500; i++) l.registrarFallo(`x${i}`)
    assert.ok(l.registros.size <= 50)
})

test("login: 5 fallos del mismo email bloquean con 429 y mensaje en minutos", () => {
    const r = reloj()
    const lim = crearLimiteLogin(r.ahora)
    for (let i = 0; i < 5; i++) {
        lim.exigirPermitido("1.1.1.1", "Ana@Correo.cl")
        lim.registrarFallo("1.1.1.1", "Ana@Correo.cl")
    }
    assert.throws(() => lim.exigirPermitido("9.9.9.9", " ana@correo.cl "), (e) => {
        assert.ok(e instanceof TooManyRequestsError)
        assert.equal(e.statusCode, 429)
        assert.equal(e.reintentarEnSegundos, 900)
        assert.match(e.message, /15 minutos/)
        return true
    })
    // otra cuenta desde otra IP sigue pudiendo entrar
    lim.exigirPermitido("9.9.9.9", "otra@correo.cl")
})

test("login: un acierto limpia los fallos de ese email", () => {
    const lim = crearLimiteLogin(reloj().ahora)
    for (let i = 0; i < 4; i++) lim.registrarFallo("1.1.1.1", "a@a.cl")
    lim.registrarExito("a@a.cl")
    lim.registrarFallo("1.1.1.1", "a@a.cl")
    lim.exigirPermitido("1.1.1.1", "a@a.cl")
})

test("login: 30 fallos desde una IP con emails distintos bloquean la IP", () => {
    const lim = crearLimiteLogin(reloj().ahora)
    for (let i = 0; i < 30; i++) lim.registrarFallo("2.2.2.2", `u${i}@a.cl`)
    assert.throws(() => lim.exigirPermitido("2.2.2.2", "nuevo@a.cl"), TooManyRequestsError)
})

test("login: emails vacíos o no texto no rompen el limitador", () => {
    const lim = crearLimiteLogin(reloj().ahora)
    lim.registrarFallo("1.1.1.1", undefined)
    lim.registrarFallo("1.1.1.1", { x: 1 })
    lim.exigirPermitido("1.1.1.1", null)
})
