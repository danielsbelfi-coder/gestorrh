const test = require("node:test")
const assert = require("node:assert/strict")
const { resolverEmpresaCliente, rutaDeVariasEmpresas } = require("../src/shared/empresa_elegida.js")

test("resolverEmpresaCliente: con la empresa elegida se limita a ella; sin cabecera, todas", () => {
    assert.deepEqual(resolverEmpresaCliente("2", [1, 2, 3], "/api/trabajadores"), { empresas: [2] })
    assert.deepEqual(resolverEmpresaCliente(undefined, [1, 2, 3], "/api/trabajadores"), { empresas: [1, 2, 3] })
    assert.deepEqual(resolverEmpresaCliente("  ", [1, 2], "/api/trabajadores"), { empresas: [1, 2] })
})

test("resolverEmpresaCliente: una empresa ajena o un valor raro → empresa_no_permitida", () => {
    assert.deepEqual(resolverEmpresaCliente("9", [1, 2], "/api/trabajadores"), { error: "empresa_no_permitida" })
    assert.deepEqual(resolverEmpresaCliente("2 OR 1=1", [1, 2], "/api/trabajadores"), { error: "empresa_no_permitida" })
    assert.deepEqual(resolverEmpresaCliente("-1", [1, 2], "/api/liquidaciones"), { error: "empresa_no_permitida" })
})

test("las pantallas de varias empresas no se limitan", () => {
    for (const url of ["/api/empresas", "/api/empresas/7", "/api/pendientes?x=1", "/api/cuenta/usuarios", "/api/auth/usuario", "/api/parametros-legales/mes/2026-10"]) {
        assert.equal(rutaDeVariasEmpresas(url), true, url)
        assert.deepEqual(resolverEmpresaCliente("9", [1, 2], url), { empresas: [1, 2] })
    }
    assert.equal(rutaDeVariasEmpresas("/api/empresasx"), false)
})
