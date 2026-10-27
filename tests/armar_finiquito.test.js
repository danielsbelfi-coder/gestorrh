const test = require("node:test")
const assert = require("node:assert")
const { armarFiniquito } = require("../src/remuneraciones/armar_finiquito.js")

const finiquito = {
    estado: "emitido",
    lugar: "Curicó",
    fecha_finiquito: "2027-08-15",
    monto_feriado: 314860,
    monto_aviso_previo: 1124460,
    monto_anios_servicio: 2248920,
    imputacion_afc: 400000,
    descuentos: [{ glosa: "Préstamo empresa", monto: 50000 }],
    total_descuentos: 450000,
    total_a_pagar: 3238240,
    detalle_calculo: { fechaIngreso: "2026-01-01", fechaTermino: "2027-08-15", causal: 18 },
    Trabajador: { Persona: { nombres: "Ana", apellido_paterno: "Soto", apellido_materno: null, rut: "88888888", dv: "8" } }
}

const entrada = {
    finiquito,
    empresa: { razon_social: "Empresa de Prueba SpA", rut: "77777777", dv: "7", direccion: "Av. Principal 100, Curicó" },
    cargo: "Analista",
    lugarServicios: "Oficina central"
}

test("finiquito: textos con nombre, fechas y causal; tabla con totales y monto en palabras", () => {
    const documento = armarFiniquito(entrada)

    assert.strictEqual(documento.borrador, false)
    assert.strictEqual(documento.lugarFecha, "En Curicó a 15 de agosto de 2027")
    assert.match(documento.primero, /Ana Soto declara haber prestado servicios a Empresa de Prueba SpA en calidad de Analista/)
    assert.match(documento.primero, /desde el 1 de enero de 2026 hasta el 15 de agosto de 2027/)
    assert.match(documento.primero, /Art\. 161 inciso 1°: Necesidades de la empresa/)
    assert.strictEqual(documento.tabla.haberes.length, 3)
    assert.deepStrictEqual(documento.tabla.descuentos.map((d) => d.nombre), ["Aporte empleador seguro de cesantía", "Préstamo empresa"])
    assert.strictEqual(documento.tabla.totalHaberes, 3688240)
    assert.match(documento.tabla.enPalabras, /^tres millones doscientos treinta y ocho mil doscientos cuarenta pesos$/)
    assert.strictEqual(documento.totalCuadra, true)
    assert.strictEqual(documento.firmas.empleador.rut, "77.777.777-7")
})

test("finiquito por renuncia: solo feriado, sin filas en cero; un borrador lo indica", () => {
    const renuncia = {
        ...finiquito, estado: "calculado", monto_aviso_previo: 0, monto_anios_servicio: 0, imputacion_afc: 0, descuentos: [],
        total_descuentos: 0, total_a_pagar: 314860, detalle_calculo: { ...finiquito.detalle_calculo, causal: 4 }
    }
    const documento = armarFiniquito({ ...entrada, finiquito: renuncia })

    assert.strictEqual(documento.borrador, true)
    assert.deepStrictEqual(documento.tabla.haberes.map((h) => h.nombre), ["Feriado legal y proporcional"])
    assert.deepStrictEqual(documento.tabla.descuentos, [])
    assert.match(documento.primero, /Art\. 159 N° 2: Renuncia del trabajador/)
})