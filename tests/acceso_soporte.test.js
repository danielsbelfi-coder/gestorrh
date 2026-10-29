const test = require("node:test")
const assert = require("node:assert/strict")
const { validarAutorizacion, estaVigente, estadoDeAcceso, rutaDePlataforma, enmascararCuenta, enmascararCuentas, resolverEmpresaSoporte } = require("../src/soporte/acceso_soporte.js")

const MOTIVO = "Revisar una liquidación"

test("autorización válida: horas permitidas y motivo de 10 a 500 caracteres", () => {
    assert.deepEqual(validarAutorizacion({ horas: 1, motivo: MOTIVO }), [])
    assert.deepEqual(validarAutorizacion({ horas: 24, motivo: MOTIVO }), [])
    assert.deepEqual(validarAutorizacion({ motivo: MOTIVO }), [], "sin horas usa 4")
    assert.equal(validarAutorizacion({ horas: 2, motivo: MOTIVO }).length, 1)
    assert.equal(validarAutorizacion({ horas: 48, motivo: MOTIVO }).length, 1)
    assert.equal(validarAutorizacion({ horas: "abc", motivo: MOTIVO }).length, 1)
    assert.equal(validarAutorizacion({ horas: 4, motivo: "corto" }).length, 1)
    assert.equal(validarAutorizacion({ horas: 4, motivo: "   corto   " }).length, 1)
    assert.equal(validarAutorizacion({ horas: 4, motivo: "x".repeat(501) }).length, 1)
    assert.equal(validarAutorizacion({ horas: 4 }).length, 1)
    assert.equal(validarAutorizacion().length, 1)
})

test("vigencia: desde <= ahora < hasta y sin revocar", () => {
    const ahora = new Date("2026-10-29T12:00:00Z")
    const base = { desde: "2026-10-29T11:00:00Z", hasta: "2026-10-29T13:00:00Z", revocado_en: null }
    assert.equal(estaVigente(base, ahora), true)
    assert.equal(estadoDeAcceso(base, ahora), "vigente")
    assert.equal(estaVigente({ ...base, hasta: "2026-10-29T12:00:00Z" }, ahora), false, "justo al vencer ya no")
    assert.equal(estadoDeAcceso({ ...base, hasta: "2026-10-29T11:30:00Z" }, ahora), "vencido")
    assert.equal(estaVigente({ ...base, desde: "2026-10-29T12:30:00Z" }, ahora), false)
    assert.equal(estadoDeAcceso({ ...base, revocado_en: "2026-10-29T11:30:00Z" }, ahora), "revocado")
    assert.equal(estaVigente(null, ahora), false)
})

test("rutas de plataforma no necesitan autorización", () => {
    for (const ruta of ["/api/auth/usuario", "/api/parametros-legales", "/api/parametros-legales/cambios?x=1", "/api/feriados/2026", "/api/afps", "/api/isapres", "/api/mutualidades", "/api/soporte/cuentas"]) {
        assert.equal(rutaDePlataforma(ruta), true, ruta)
    }
    for (const ruta of ["/api/personas/1", "/api/empresas", "/api/liquidaciones", "/api/parametros-legalesX", "/api/authx", "/api/cuenta/accesos-soporte"]) {
        assert.equal(rutaDePlataforma(ruta), false, ruta)
    }
})

test("enmascarar número de cuenta", () => {
    assert.equal(enmascararCuenta("12345678"), "****5678")
    assert.equal(enmascararCuenta(98765432), "****5432")
    assert.equal(enmascararCuenta("1234"), "****")
    assert.equal(enmascararCuenta(""), "****")
    assert.equal(enmascararCuenta(null), "****")
})

test("enmascarar en cualquier nivel de la respuesta, sin tocar lo demás", () => {
    const entrada = { id: 1, numero_cuenta: "12345678", banco: "Banco X", fecha: new Date("2026-01-01"), hijos: [{ numero_cuenta: "99990000" }, { numero_cuenta: null }], otro: { Persona: { numero_cuenta: "55556666" } } }
    const salida = enmascararCuentas(entrada)
    assert.equal(salida.numero_cuenta, "****5678")
    assert.equal(salida.banco, "Banco X")
    assert.equal(salida.hijos[0].numero_cuenta, "****0000")
    assert.equal(salida.hijos[1].numero_cuenta, null)
    assert.equal(salida.otro.Persona.numero_cuenta, "****6666")
    assert.ok(salida.fecha instanceof Date)
    assert.equal(entrada.numero_cuenta, "12345678", "no modifica el original")
})

test("X-Empresa: soporte trabaja con una sola empresa autorizada a la vez", () => {
    const accesos = [{ id: 1, empresa_id: 7, cuenta_id: 3 }, { id: 2, empresa_id: 9, cuenta_id: 4 }]

    assert.deepEqual(resolverEmpresaSoporte(undefined, accesos), { permitido: true, acceso: null, detalle: "Sin X-Empresa", empresaIntentada: null })
    assert.deepEqual(resolverEmpresaSoporte(" ", accesos), { permitido: true, acceso: null, detalle: "Sin X-Empresa", empresaIntentada: null })
    assert.deepEqual(resolverEmpresaSoporte("7", accesos), { permitido: true, acceso: accesos[0], detalle: null, empresaIntentada: null })
    assert.equal(resolverEmpresaSoporte(" 9 ", accesos).acceso, accesos[1])
    // Sin acceso vigente a esa empresa, o valores raros: no permitido, y el valor (recortado) queda en el registro.
    assert.deepEqual(resolverEmpresaSoporte("8", accesos), { permitido: false, acceso: null, detalle: "X-Empresa: 8", empresaIntentada: 8 })
    assert.equal(resolverEmpresaSoporte("abc", accesos).empresaIntentada, null)
    assert.equal(resolverEmpresaSoporte("9999999999", accesos).empresaIntentada, null)
    assert.equal(resolverEmpresaSoporte("7,9", accesos).permitido, false)
    assert.equal(resolverEmpresaSoporte("7 OR 1=1", accesos).permitido, false)
    assert.equal(resolverEmpresaSoporte("-7", accesos).permitido, false)
    assert.equal(resolverEmpresaSoporte("x".repeat(100), accesos).detalle.length, "X-Empresa: ".length + 20)
    assert.equal(resolverEmpresaSoporte("7", []).permitido, false)
})
