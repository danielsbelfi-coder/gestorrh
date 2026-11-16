const { test } = require("node:test")
const assert = require("node:assert")
const { validarRolesIniciales } = require("../src/empresas/roles_iniciales.js")
const { rutaDeVariasEmpresas } = require("../src/shared/empresa_elegida.js")

const ASIGNABLES = ["ADMIN", "JEFE_RRHH", "RRHH"]
const usuarios = [
    { id: 1, nombre: "Admin", estado: "activo" },
    { id: 2, nombre: "Ana", estado: "activo" },
    { id: 3, nombre: "Beto", estado: "activo" },
    { id: 4, nombre: "Carla", estado: "inactivo" }
]

test("sin lista no hay roles ni errores", () => {
    assert.deepStrictEqual(validarRolesIniciales(undefined, usuarios, 1, ASIGNABLES), { roles: [], errores: [] })
    assert.deepStrictEqual(validarRolesIniciales([], usuarios, 1, ASIGNABLES), { roles: [], errores: [] })
})

test("asigna roles a usuarios que ya existen y omite a los «sin acceso»", () => {
    const { roles, errores } = validarRolesIniciales([
        { usuario_id: 2, rol: "RRHH" }, { usuario_id: "3", rol: "JEFE_RRHH" }, { usuario_id: 99, rol: "" }
    ], usuarios, 1, ASIGNABLES)

    assert.deepStrictEqual(errores, [])
    assert.deepStrictEqual(roles, [{ usuario_id: 2, rol: "RRHH" }, { usuario_id: 3, rol: "JEFE_RRHH" }])
})

test("el creador queda fuera de la lista (ya es ADMIN de la empresa)", () => {
    const { roles, errores } = validarRolesIniciales([{ usuario_id: 1, rol: "RRHH" }], usuarios, 1, ASIGNABLES)

    assert.deepStrictEqual(roles, [])
    assert.deepStrictEqual(errores, [])
})

test("rechaza usuarios de otra cuenta, inactivos, roles inválidos y repetidos", () => {
    const { roles, errores } = validarRolesIniciales([
        { usuario_id: 50, rol: "RRHH" },
        { usuario_id: 4, rol: "RRHH" },
        { usuario_id: 2, rol: "SUPERMAN" },
        { usuario_id: 3, rol: "RRHH" },
        { usuario_id: 3, rol: "ADMIN" }
    ], usuarios, 1, ASIGNABLES)

    assert.deepStrictEqual(roles, [{ usuario_id: 3, rol: "RRHH" }])
    assert.strictEqual(errores.length, 4)
    assert.match(errores[0], /no existe en la cuenta/)
    assert.match(errores[1], /inactivo/)
    assert.match(errores[2], /SUPERMAN/)
    assert.match(errores[3], /más de una vez/)
})

test("una lista que no es arreglo da error", () => {
    assert.strictEqual(validarRolesIniciales("x", usuarios, 1, ASIGNABLES).errores.length, 1)
})

test("la lista de usuarios de la cuenta no depende de la empresa elegida en la barra", () => {
    assert.strictEqual(rutaDeVariasEmpresas("/api/cuenta/usuarios"), true)
    assert.strictEqual(rutaDeVariasEmpresas("/api/cuenta/usuarios/5/empresas/2/rol"), true)
    assert.strictEqual(rutaDeVariasEmpresas("/api/personas"), false)
})
