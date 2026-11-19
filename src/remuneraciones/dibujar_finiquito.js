const { marcaBorrador } = require("./dibujar_liquidacion.js")

const MARGEN = 40
const ANCHO = 612 - MARGEN * 2
const ANCHO_COLUMNA = ANCHO / 2
const ALTO_FILA = 14

function miles(monto) {
    return monto.toLocaleString("es-CL")
}

function parrafo(doc, texto) {
    doc.font("Helvetica").fontSize(9).text(texto, MARGEN, doc.y, { width: ANCHO, align: "justify" })
    doc.moveDown(0.8)
}

const ANCHO_TEXTO = ANCHO_COLUMNA - 90

// Alto de una fila: el texto largo (por ejemplo, «Indemnización por término de obra o faena (art. 163 inc. 3°, 7,5 días)»)
// se escribe completo en más de una línea, sin recortarlo.
function altoDeFila(doc, textos) {
    doc.font("Helvetica").fontSize(9)
    const alto = Math.max(...textos.map((t) => (t ? doc.heightOfString(t, { width: ANCHO_TEXTO }) : 0)))
    return Math.max(ALTO_FILA, Math.ceil(alto) + 5)
}

function celda(doc, x, y, texto, monto, negrita = false, alto = ALTO_FILA) {
    doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(9)
    doc.text(texto, x + 4, y + 3, { width: ANCHO_TEXTO })
    if (monto !== null) {
        doc.text(miles(monto), x + ANCHO_COLUMNA - 86, y + 3, { width: 80, align: "right" })
    }
    doc.rect(x, y, ANCHO_COLUMNA, alto).stroke()
}

function tabla(doc, t) {
    const xDerecha = MARGEN + ANCHO_COLUMNA
    let y = doc.y

    doc.lineWidth(0.5)
    doc.rect(MARGEN, y, ANCHO, ALTO_FILA).fill("#e6e6e6")
    doc.fillColor("black").font("Helvetica-Bold").fontSize(9)
    doc.text("HABERES", MARGEN, y + 3, { width: ANCHO_COLUMNA, align: "center" })
    doc.text("DESCUENTOS", xDerecha, y + 3, { width: ANCHO_COLUMNA, align: "center" })
    y += ALTO_FILA

    const filas = Math.max(t.haberes.length, t.descuentos.length, 1)
    for (let i = 0; i < filas; i++) {
        const haber = t.haberes[i]
        const descuento = t.descuentos[i]
        const alto = altoDeFila(doc, [haber?.nombre, descuento?.nombre])
        celda(doc, MARGEN, y, haber ? haber.nombre : "", haber ? haber.monto : null, false, alto)
        celda(doc, xDerecha, y, descuento ? descuento.nombre : "", descuento ? descuento.monto : null, false, alto)
        y += alto
    }

    celda(doc, MARGEN, y, "TOTAL HABERES", t.totalHaberes, true)
    celda(doc, xDerecha, y, "TOTAL DESCUENTOS", t.totalDescuentos, true)
    y += ALTO_FILA
    celda(doc, xDerecha, y, "LÍQUIDO A PAGAR", t.liquido, true)
    y += ALTO_FILA + 6

    doc.font("Helvetica").fontSize(9).text(`Son: (${t.enPalabras})`, MARGEN, y, { width: ANCHO })
    doc.moveDown(1)
}

function firmas(doc, f) {
    const y = doc.y + 50
    const anchoFirma = 200
    const xTrabajador = MARGEN + 20
    const xEmpleador = MARGEN + ANCHO - 20 - anchoFirma

    doc.lineWidth(0.5)
    doc.moveTo(xTrabajador, y).lineTo(xTrabajador + anchoFirma, y).stroke()
    doc.moveTo(xEmpleador, y).lineTo(xEmpleador + anchoFirma, y).stroke()

    doc.font("Helvetica-Bold").fontSize(9)
    doc.text("Firma Trabajador", xTrabajador, y + 4, { width: anchoFirma, align: "center" })
    doc.text("Firma Empleador", xEmpleador, y + 4, { width: anchoFirma, align: "center" })
    doc.font("Helvetica").fontSize(8)
    doc.text(`${f.trabajador.nombre}\nRUT: ${f.trabajador.rut}`, xTrabajador, y + 16, { width: anchoFirma, align: "center" })
    doc.text(`${f.empleador.nombre}\nRUT: ${f.empleador.rut}`, xEmpleador, y + 16, { width: anchoFirma, align: "center" })
}

function dibujarFiniquito(doc, d) {
    doc.font("Helvetica-Bold").fontSize(14).text("FINIQUITO DE TRABAJADOR", MARGEN, MARGEN, { width: ANCHO, align: "center" })
    doc.moveDown(1)
    doc.font("Helvetica").fontSize(9).text(d.lugarFecha, MARGEN, doc.y, { width: ANCHO, align: "right" })
    doc.moveDown(1)

    parrafo(doc, d.introduccion)
    parrafo(doc, d.primero)
    parrafo(doc, d.segundo)
    tabla(doc, d.tabla)

    for (const clausula of d.clausulas) {
        parrafo(doc, clausula)
    }

    firmas(doc, d.firmas)

    if (d.borrador) {
        marcaBorrador(doc)
    }
}

module.exports = {
    dibujarFiniquito
}