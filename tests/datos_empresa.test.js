const { test } = require("node:test")
const assert = require("node:assert")
const { validarDatosEmpresa } = require("../src/empresas/datos_empresa.js")

const base = { tipo_empleador: "juridica", razon_social: "Empresa SpA", representante_legal_rut: "12345678-5" }

test("persona jurídica válida: formatea el RUT del representante y vacíos a null", () => {
    const { datos, errores } = validarDatosEmpresa({ ...base, giro: "  ", email: "contacto@empresa.cl" })
    assert.deepStrictEqual(errores, [])
    assert.strictEqual(datos.representante_legal_rut, "12.345.678-5")
    assert.strictEqual(datos.giro, null)
    assert.strictEqual(datos.nombres, null)
})

test("persona natural: exige nombres y arma la razón social", () => {
    const sinNombre = validarDatosEmpresa({ tipo_empleador: "natural", razon_social: "", representante_legal_rut: "12345678-5" })
    assert.match(sinNombre.errores.join(), /persona natural/)

    const { datos, errores } = validarDatosEmpresa({ tipo_empleador: "natural", nombres: "Juan", apellido_paterno: "Pérez", apellido_materno: "Soto", razon_social: "", representante_legal_rut: "12345678-5" })
    assert.deepStrictEqual(errores, [])
    assert.strictEqual(datos.razon_social, "Juan Pérez Soto")
})

test("valida código de actividad, comuna, correos, RUT del representante y CCAF", () => {
    const { errores } = validarDatosEmpresa({
        ...base, codigo_actividad: "12345", comuna: "99999", email: "malo", representante_legal_email: "x@",
        representante_legal_rut: "12345678-1", ccaf: "inventada"
    })
    assert.strictEqual(errores.length, 6)
})

test("acepta datos válidos de CCAF y actividad; sin CCAF limpia agencia y socio", () => {
    const con = validarDatosEmpresa({ ...base, codigo_actividad: "011101", comuna: "7301", ccaf: "los_andes", ccaf_agencia: "Curicó" })
    assert.deepStrictEqual(con.errores, [])
    const sin = validarDatosEmpresa({ ...base, ccaf: "", ccaf_agencia: "Curicó", ccaf_numero_socio: "123" })
    assert.strictEqual(sin.datos.ccaf, null)
    assert.strictEqual(sin.datos.ccaf_agencia, null)
})

test("edición parcial: solo revisa lo que viene", () => {
    assert.deepStrictEqual(validarDatosEmpresa({ telefono: "+56 9 1234 5678" }).errores, [])
})
