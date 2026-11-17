const { textoLicencia } = require("./presentacion_liquidacion.js")

const TAMANO_PAGINA = "LETTER"
const ANCHO_PAGINA = 612
const MARGEN = 40
const ANCHO = ANCHO_PAGINA - MARGEN * 2

function pesos(monto) {
    return `$ ${monto.toLocaleString("es-CL")}`
}

function encabezado(doc, d) {
    doc.font("Helvetica-Bold").fontSize(11).text(d.empresa.razonSocial, MARGEN, MARGEN)
    doc.font("Helvetica").fontSize(9).text(`RUT ${d.empresa.rut}`).text(d.empresa.direccion)
    doc.moveDown(1)
    doc.font("Helvetica-Bold").fontSize(13).text("LIQUIDACIÓN DE REMUNERACIONES", { align: "center" })
    doc.font("Helvetica").fontSize(10).text(d.periodo.toUpperCase(), { align: "center" })
    if (d.version >= 2) {
        doc.font("Helvetica").fontSize(8)
            .text(`Versión ${d.version} — reemplaza a la versión ${d.version - 1}`, { align: "center" })
    }
    doc.moveDown(1)
}

function datosTrabajador(doc, d) {
    const t = d.trabajador
    const filas = [
        ["Nombre", t.nombre, "RUT", t.rut],
        ["Cargo", t.cargo, "Fecha de ingreso", t.fechaIngreso],
        ["Tipo de contrato", t.tipoContrato, "Sueldo base", pesos(t.sueldoBase)],
        ["AFP", t.afp, "Salud", t.salud],
        ["Días trabajados", String(t.diasTrabajados), d.fechaPago ? "Fecha de pago" : "", d.fechaPago ?? ""]
    ]
    const mitad = ANCHO / 2
    const etiqueta = 90

    doc.fontSize(9)
    for (const [e1, v1, e2, v2] of filas) {
        const y = doc.y
        doc.font("Helvetica-Bold").text(e1, MARGEN, y, { width: etiqueta })
        doc.font("Helvetica").text(v1, MARGEN + etiqueta, y, { width: mitad - etiqueta })
        doc.font("Helvetica-Bold").text(e2, MARGEN + mitad, y, { width: etiqueta })
        doc.font("Helvetica").text(v2, MARGEN + mitad + etiqueta, y, { width: mitad - etiqueta })
        doc.y = y + 14
    }
    doc.moveDown(1)
}

const ALTO_FILA = 13
const SEPARACION = 10
const ANCHO_COLUMNA = (ANCHO - SEPARACION) / 2

function miles(monto) {
    return monto.toLocaleString("es-CL")
}

function barra(doc, x, y, texto, alineacion = "left", ancho = ANCHO_COLUMNA) {
    doc.rect(x, y, ancho, ALTO_FILA + 2).fill("#e6e6e6")
    doc.fillColor("black").font("Helvetica-Bold").fontSize(9)
        .text(texto, x + 3, y + 3, { width: ancho - 6, align: alineacion })
    return y + ALTO_FILA + 4
}

function textoFila(f) {
    return f.cantidad === null ? f.nombre : `${f.nombre} (${String(f.cantidad).replace(".", ",")})`
}

const ANCHO_GLOSA = ANCHO_COLUMNA - 80

// Si la glosa no cabe en la columna, se achica la letra (hasta 7 pt) antes de cortarla con puntos suspensivos.
function tamanoParaGlosa(doc, texto) {
    let tamano = 9
    doc.font("Helvetica")
    while (tamano > 7 && doc.fontSize(tamano).widthOfString(texto) > ANCHO_GLOSA) {
        tamano -= 0.5
    }
    return tamano
}

function filaColumna(doc, x, y, texto, monto) {
    const tamano = tamanoParaGlosa(doc, texto)
    doc.font("Helvetica").fontSize(tamano)
    doc.text(texto, x + 3, y + (9 - tamano) / 2, { width: ANCHO_GLOSA, height: ALTO_FILA, ellipsis: true })
    doc.fontSize(9)
    doc.text(miles(monto), x + ANCHO_COLUMNA - 80, y, { width: 77, align: "right" })
    return y + ALTO_FILA
}

function columna(doc, x, y, bloques) {
    for (const bloque of bloques) {
        y = barra(doc, x, y, bloque.titulo)
        for (const f of bloque.filas) {
            y = filaColumna(doc, x, y, textoFila(f), f.monto)
        }
        doc.font("Helvetica-Bold").fontSize(9)
            .text(`${bloque.etiquetaTotal}: ${miles(bloque.total)}`, x, y, { width: ANCHO_COLUMNA - 3, align: "right" })
        y = y + ALTO_FILA + 6
    }
    return y
}

// Licencias médicas del mes (fechas, días y folio). Si no hay, no se dibuja nada.
function licencias(doc, d) {
    if (!d.licencias || d.licencias.length === 0) {
        return
    }

    doc.x = MARGEN
    doc.y = barra(doc, MARGEN, doc.y, "LICENCIAS MÉDICAS DEL MES", "left", ANCHO)
    doc.font("Helvetica").fontSize(8.5)
    for (const licencia of d.licencias) {
        doc.text(textoLicencia(licencia), MARGEN + 3, doc.y, { width: ANCHO - 6 })
    }
    doc.x = MARGEN
    doc.moveDown(0.8)
}

function liquido(doc, d) {
    const y = doc.y
    doc.rect(MARGEN, y, ANCHO, 22).fill("#d0d0d0")
    doc.fillColor("black").font("Helvetica-Bold").fontSize(11)
        .text(`LÍQUIDO A PAGAR: $ ${miles(d.liquido)}`, MARGEN + 5, y + 6, { width: ANCHO - 10, align: "right" })
    doc.font("Helvetica").fontSize(9)
        .text(`Son: ${d.liquidoEnPalabras}`, MARGEN, y + 28, { width: ANCHO })
    doc.x = MARGEN
    doc.moveDown(2)
}

function firmas(doc, d) {
    doc.font("Helvetica").fontSize(8).text(
        `Certifico que he recibido de ${d.empresa.razonSocial} el saldo líquido indicado en la presente liquidación, a mi entera satisfacción, y no tengo cargo ni cobro posterior que hacer.`,
        MARGEN, doc.y, { width: ANCHO, align: "justify" }
    )

    const y = doc.y + 45
    const anchoFirma = 180
    const xTrabajador = MARGEN + 30
    const xEmpleador = MARGEN + ANCHO - 30 - anchoFirma

    doc.lineWidth(0.5)
    doc.moveTo(xTrabajador, y).lineTo(xTrabajador + anchoFirma, y).stroke()
    doc.moveTo(xEmpleador, y).lineTo(xEmpleador + anchoFirma, y).stroke()

    doc.fontSize(9)
    doc.text("Firma del trabajador", xTrabajador, y + 4, { width: anchoFirma, align: "center" })
    doc.text("Firma del empleador", xEmpleador, y + 4, { width: anchoFirma, align: "center" })

    doc.x = MARGEN
    doc.moveDown(2)
}

function aportesEmpleador(doc, d) {
    const y = columna(doc, MARGEN, doc.y, [
        { titulo: "APORTES DEL EMPLEADOR", filas: d.secciones.aportes, etiquetaTotal: "Total aportes", total: d.totales.aportes }
    ])
    doc.x = MARGEN
    doc.y = y
}

function marcaBorrador(doc) {
    const ancho = doc.page.width
    const alto = doc.page.height

    doc.save()
    doc.rotate(-45, { origin: [ancho / 2, alto / 2] })
    doc.fillColor("#b00000").fillOpacity(0.15).font("Helvetica-Bold").fontSize(100)
        .text("BORRADOR", 0, alto / 2 - 50, { width: ancho, align: "center", lineBreak: false })
    doc.restore()
}

function dibujarLiquidacion(doc, d, { conAportes = false } = {}) {
    const s = d.secciones
    const t = d.totales

    encabezado(doc, d)
    datosTrabajador(doc, d)

    const xIzquierda = MARGEN
    const xDerecha = MARGEN + ANCHO_COLUMNA + SEPARACION
    const yInicio = doc.y

    const yIzquierda = columna(doc, xIzquierda, yInicio, [
        { titulo: "HABERES IMPONIBLES", filas: s.imponibles, etiquetaTotal: "Total imponible", total: t.imponible },
        { titulo: "HABERES NO IMPONIBLES", filas: s.noImponibles, etiquetaTotal: "Total no imponible", total: t.noImponible }
    ])
    const yDerecha = columna(doc, xDerecha, yInicio, [
        { titulo: "DESCUENTOS LEGALES", filas: s.legales, etiquetaTotal: "Total descuentos legales", total: t.legales },
        { titulo: "OTROS DESCUENTOS", filas: s.otros, etiquetaTotal: "Total otros descuentos", total: t.otros }
    ])

    const ySuma = Math.max(yIzquierda, yDerecha)
    barra(doc, xIzquierda, ySuma, `Total haberes: ${miles(t.haberes)}`, "right")
    barra(doc, xDerecha, ySuma, `Total descuentos: ${miles(t.descuentos)}`, "right")

    doc.x = MARGEN
    doc.y = ySuma + ALTO_FILA + 12
    licencias(doc, d)
    liquido(doc, d)
    firmas(doc, d)

    if (conAportes) {
        aportesEmpleador(doc, d)
    }

    if (d.borrador) {
        marcaBorrador(doc)
    }
}

module.exports = {
    dibujarLiquidacion,
    TAMANO_PAGINA,
    marcaBorrador
}