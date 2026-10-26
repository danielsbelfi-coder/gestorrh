const test = require("node:test")
const assert = require("node:assert")
const { armarDocumento } = require("../src/remuneraciones/armar_documento.js")

function linea(codigo, tipo, monto, imponible = false) {
    return { codigo, nombre: codigo, tipo, monto, imponible, cantidad: null }
}

function liquidacion(liquido) {
    return {
        estado: "calculada",
        version: 1,
        liquido_a_pagar: String(liquido),
        dias_trabajados: 30,
        snapshot_contrato: { tipo_contrato: "plazo_fijo", sueldo_base: "500000" },
        PeriodoRemuneracion: { mes: 1, anio: 2027, Empresa: { razon_social: "Empresa", rut: "77777777", dv: "7", direccion: "Calle 1" } },
        Trabajador: { fecha_ingreso: "2026-03-01", Persona: { nombres: "Juan", apellido_paterno: "Pérez", apellido_materno: null, rut: "12345678", dv: "5", sistema_salud: "Fonasa", Afp: { nombre: "AFP Uno" } } },
        LiquidacionLineas: [
            linea("SUELDO_BASE", "haber", 500000, true),
            linea("COLACION", "haber", 40000),
            linea("DESCUENTO_ATRASOS", "descuento", 10000, true),
            linea("AFP", "descuento", 50000),
            linea("ANTICIPO", "descuento", 100000),
            linea("APORTE_MUTUAL", "aporte_empleador", 4500)
        ]
    }
}

test("el atraso va en negativo dentro de los imponibles y cada descuento en su sección", () => {
    const d = armarDocumento(liquidacion(380000), null)

    assert.strictEqual(d.totales.imponible, 490000)
    assert.strictEqual(d.totales.noImponible, 40000)
    assert.strictEqual(d.totales.legales, 50000)
    assert.strictEqual(d.totales.otros, 100000)
    assert.strictEqual(d.totales.aportes, 4500)
    assert.strictEqual(d.liquido, 380000)
    assert.strictEqual(d.borrador, true)
    assert.strictEqual(d.trabajador.nombre, "Juan Pérez")
    assert.strictEqual(d.trabajador.tipoContrato, "Plazo fijo")
    assert.strictEqual(d.secciones.imponibles[1].monto, -10000)
})

test("si las secciones no cuadran con el líquido guardado, lanza un error", () => {
    assert.throws(() => armarDocumento(liquidacion(999999), null))
})