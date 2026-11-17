const { test } = require("node:test")
const assert = require("node:assert")
const { validarSucursal, lugarDeSucursal, lugarDeCasaMatriz } = require("../src/empresas/sucursales.js")
const { valorLugar, leerValorLugar, expandirAnexos, mismoLugar } = require("../src/contratos/anexo_sucursal.js")
const { contratoOriginal } = require("../src/contratos/contrato_original.js")
const { contratoDelMes } = require("../src/remuneraciones/contrato_del_mes.js")
const { textoModificacion } = require("../src/contratos/armar_anexo.js")
const { validarDatosEmpresa } = require("../src/empresas/datos_empresa.js")

const CURICO = "7301"
const TALCA = "7101"

test("validación de la sucursal", () => {
    const { datos, errores } = validarSucursal({ nombre: "  Centro ", direccion: " Prat 123 ", comuna: CURICO }, { crear: true })
    assert.deepStrictEqual(errores, [])
    assert.deepStrictEqual(datos, { nombre: "Centro", direccion: "Prat 123", comuna: CURICO })
    assert.strictEqual(validarSucursal({}, { crear: true }).errores.length, 3)
    assert.match(validarSucursal({ comuna: "99999" }).errores[0], /comuna/)
    assert.deepStrictEqual(validarSucursal({ activo: false }), { datos: { activo: false }, errores: [] })
    assert.strictEqual(validarSucursal({ direccion: "x".repeat(151) }).errores.length, 1)
})

test("el contrato copia el lugar y la comuna de la sucursal o de la casa matriz", () => {
    assert.deepStrictEqual(lugarDeSucursal({ id: 4, nombre: "Centro", direccion: "Prat 123", comuna: CURICO }),
        { sucursal_id: 4, lugar_prestacion_servicios: "Centro, Prat 123", comuna_prestacion: CURICO })
    assert.deepStrictEqual(lugarDeCasaMatriz({ direccion: "Peña 50", comuna: TALCA }),
        { sucursal_id: null, lugar_prestacion_servicios: "Casa matriz, Peña 50", comuna_prestacion: TALCA })
    assert.ok(lugarDeCasaMatriz({ direccion: "Peña 50", comuna: null }).error)
})

const contrato = { id: 1, sucursal_id: null, lugar_prestacion_servicios: "Casa matriz, Peña 50", comuna_prestacion: TALCA, sueldo_base: 800000 }
const nuevo = { sucursal_id: 4, lugar_prestacion_servicios: "Centro, Prat 123", comuna_prestacion: CURICO }
// Anexo firmado de cambio a la sucursal Centro desde el 16-10; la fila del contrato ya tiene el lugar nuevo.
const anexo = { id: 7, campo_modificado: "sucursal", estado_firma: "firmado", fecha_vigencia: "2026-10-16", fecha_firma: "2026-10-10", valor_anterior: valorLugar(contrato), valor_nuevo: valorLugar(nuevo) }
const vigente = { ...contrato, ...nuevo }

test("el anexo de sucursal guarda los tres campos y se expande en tres anexos", () => {
    assert.deepStrictEqual(leerValorLugar(anexo.valor_nuevo), nuevo)
    assert.strictEqual(leerValorLugar("no es json"), null)
    const expandidos = expandirAnexos([anexo, { id: 8, campo_modificado: "sueldo_base" }])
    assert.deepStrictEqual(expandidos.map((a) => [a.campo_modificado, a.valor_anterior, a.valor_nuevo]), [
        ["sucursal_id", null, 4],
        ["lugar_prestacion_servicios", "Casa matriz, Peña 50", "Centro, Prat 123"],
        ["comuna_prestacion", TALCA, CURICO],
        ["sueldo_base", undefined, undefined]
    ])
    assert.ok(mismoLugar(vigente, nuevo))
    assert.ok(!mismoLugar(contrato, nuevo))
})

test("el contrato original vuelve a la casa matriz; el cálculo de cada mes usa el lugar vigente", () => {
    const original = contratoOriginal(vigente, [anexo])
    assert.strictEqual(original.lugar_prestacion_servicios, "Casa matriz, Peña 50")
    assert.strictEqual(original.comuna_prestacion, TALCA)
    assert.strictEqual(original.sucursal_id, null)

    assert.strictEqual(contratoDelMes({ contrato: vigente, anexos: [anexo], anio: 2026, mes: 9 }).contrato.comuna_prestacion, TALCA)
    const octubre = contratoDelMes({ contrato: vigente, anexos: [anexo], anio: 2026, mes: 10 }).contrato
    assert.strictEqual(octubre.comuna_prestacion, CURICO)
    assert.strictEqual(octubre.sucursal_id, 4)
})

test("texto del anexo de sucursal", () => {
    assert.strictEqual(textoModificacion(anexo),
        "Las partes acuerdan que, a contar del 16 de octubre de 2026, el TRABAJADOR prestará sus servicios en Centro, Prat 123, comuna de Curicó.")
})

test("la empresa guarda la regla de fecha de pago", () => {
    const { datos, errores } = validarDatosEmpresa({ regla_fecha_pago: "dia_mes_siguiente", dia_pago: "5" })
    assert.deepStrictEqual(errores, [])
    assert.strictEqual(datos.dia_pago, 5)
    assert.strictEqual(validarDatosEmpresa({ regla_fecha_pago: "dia_mes_siguiente" }).errores.length, 1)
    assert.deepStrictEqual(validarDatosEmpresa({ razon_social: "X" }).datos.regla_fecha_pago, undefined)
})
