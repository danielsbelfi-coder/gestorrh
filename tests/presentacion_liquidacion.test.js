const test = require("node:test")
const assert = require("node:assert")
const { glosaCorta, lineasSueldoPorTramo, licenciasParaDocumento, textoLicencia } = require("../src/remuneraciones/presentacion_liquidacion.js")
const { armarDocumento } = require("../src/remuneraciones/armar_documento.js")
const { dibujarLiquidacion } = require("../src/remuneraciones/dibujar_liquidacion.js")

test("el sueldo con anexo se muestra en una línea por tramo y suma lo mismo", () => {
    const filas = lineasSueldoPorTramo(
        { nombre: "Sueldo base", cantidad: 30, monto: 675000 },
        [{ desdeDia: 1, sueldo: 650000, dias: 15 }, { desdeDia: 16, sueldo: 700000, dias: 15 }]
    )

    assert.deepStrictEqual(filas.map((f) => f.nombre), ["Sueldo base 01 al 15", "Sueldo base 16 al 30"])
    assert.deepStrictEqual(filas.map((f) => f.cantidad), [15, 15])
    assert.deepStrictEqual(filas.map((f) => f.monto), [325000, 350000])
})

test("la diferencia por redondeo la absorbe el último tramo y un tramo sin días no se muestra", () => {
    const filas = lineasSueldoPorTramo(
        { nombre: "Sueldo base", cantidad: 29, monto: 100001 },
        [{ desdeDia: 1, sueldo: 100000, dias: 10 }, { desdeDia: 11, sueldo: 100001, dias: 19 }, { desdeDia: 30, sueldo: 120000, dias: 0 }]
    )

    assert.strictEqual(filas.length, 2)
    assert.strictEqual(filas.reduce((suma, f) => suma + f.monto, 0), 100001)
})

test("con un solo tramo la línea queda igual", () => {
    const fila = { nombre: "Sueldo base", cantidad: 30, monto: 500000 }
    assert.deepStrictEqual(lineasSueldoPorTramo(fila, [{ desdeDia: 1, sueldo: 500000, dias: 30 }]), [fila])
    assert.deepStrictEqual(lineasSueldoPorTramo(fila, undefined), [fila])
})

test("licencia dentro del mes: días, fechas y folio", () => {
    const [l] = licenciasParaDocumento([{ fecha_inicio: "2026-11-08", fecha_termino: "2026-11-14", tipo: "comun", folio: "A-123" }], 2026, 11)

    assert.strictEqual(l.dias, 7)
    assert.strictEqual(textoLicencia(l), "Licencia médica común: 08-11-2026 al 14-11-2026 · 7 días · folio A-123")
})

test("licencia que cruza el mes cuenta solo los días del mes y avisa el total", () => {
    const [l] = licenciasParaDocumento([{ fecha_inicio: "2026-10-28", fecha_termino: "2026-11-03", tipo: "maternal", folio: null }], 2026, 11)

    assert.strictEqual(l.dias, 3)
    assert.strictEqual(l.diasTotales, 7)
    assert.strictEqual(textoLicencia(l), "Licencia médica maternal: 28-10-2026 al 03-11-2026 · 3 días en el mes (de 7)")
})

test("sin licencias (o liquidaciones antiguas sin el dato) no hay nada que mostrar", () => {
    assert.deepStrictEqual(licenciasParaDocumento(undefined, 2026, 11), [])
    assert.deepStrictEqual(licenciasParaDocumento([], 2026, 11), [])
})

test("las glosas largas tienen nombre corto y las demás quedan igual", () => {
    assert.strictEqual(glosaCorta("REMUNERACION_VARIABLE_VACACIONES", "Remuneración variable en vacaciones (art. 71)"), "Rem. variable vacaciones (art. 71)")
    assert.strictEqual(glosaCorta("COLACION", "Colación"), "Colación")
})

function liquidacionConAnexo() {
    const linea = (codigo, nombre, tipo, monto, imponible = false) => ({ codigo, nombre, tipo, monto, imponible, cantidad: null })
    return {
        estado: "emitida",
        version: 1,
        liquido_a_pagar: "675000",
        dias_trabajados: 30,
        snapshot_contrato: { tipo_contrato: "indefinido", sueldo_base: "700000" },
        detalle_calculo: {
            sueldo: { tramos: [{ desdeDia: 1, sueldo: 650000, dias: 15 }, { desdeDia: 16, sueldo: 700000, dias: 15 }] },
            licencias: [{ fecha_inicio: "2026-11-02", fecha_termino: "2026-11-04", tipo: "comun", folio: "99" }]
        },
        PeriodoRemuneracion: { mes: 11, anio: 2026, Empresa: { razon_social: "Panadería Los Aromos", rut: "77777777", dv: "7", direccion: "Calle 1" } },
        Trabajador: { fecha_ingreso: "2026-03-01", Persona: { nombres: "Joaquín", apellido_paterno: "Pérez", apellido_materno: null, rut: "12345678", dv: "5", sistema_salud: "Fonasa", Afp: { nombre: "AFP Uno" } } },
        LiquidacionLineas: [
            linea("SUELDO_BASE", "Sueldo base", "haber", 675000, true),
            linea("REMUNERACION_VARIABLE_VACACIONES", "Remuneración variable en vacaciones (art. 71)", "haber", 0, true)
        ]
    }
}

test("el documento trae el sueldo por tramos y las licencias", () => {
    const d = armarDocumento(liquidacionConAnexo(), null)

    assert.deepStrictEqual(d.secciones.imponibles.map((f) => f.nombre), [
        "Sueldo base 01 al 15", "Sueldo base 16 al 30", "Rem. variable vacaciones (art. 71)"
    ])
    assert.strictEqual(d.totales.imponible, 675000)
    assert.strictEqual(d.licencias.length, 1)
    assert.strictEqual(d.licencias[0].folio, "99")
})

test("el PDF se dibuja con tramos, licencias y glosas largas sin fallar", async () => {
    const PDFDocument = require("pdfkit")
    const doc = new PDFDocument({ size: "LETTER" })
    const trozos = []
    doc.on("data", (t) => trozos.push(t))
    const terminado = new Promise((resolver) => doc.on("end", resolver))

    dibujarLiquidacion(doc, armarDocumento(liquidacionConAnexo(), null))
    doc.end()
    await terminado

    assert.ok(Buffer.concat(trozos).length > 1000)
})
