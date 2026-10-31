const MARGEN = 50
const ANCHO = 612 - MARGEN * 2

function seccion(doc, titulo, texto) {
    doc.font("Helvetica-Bold").fontSize(9).text(titulo, MARGEN, doc.y, { width: ANCHO })
    doc.moveDown(0.2)
    doc.font("Helvetica").fontSize(9).text(texto, MARGEN, doc.y, { width: ANCHO, align: "justify" })
    doc.moveDown(0.8)
}

function clausula(doc, { ordinal, texto }) {
    const [primera, ...resto] = texto.split("\n")
    doc.font("Helvetica-Bold").fontSize(9).text(`${ordinal}: `, MARGEN, doc.y, { width: ANCHO, continued: true })
    doc.font("Helvetica").text(primera, { width: ANCHO, align: "justify" })
    for (const linea of resto) {
        doc.moveDown(0.2)
        doc.text(linea, MARGEN + 12, doc.y, { width: ANCHO - 12, align: "justify" })
    }
    doc.moveDown(0.7)
}

function firmas(doc, f) {
    if (doc.y > 792 - MARGEN - 110) {
        doc.addPage()
    }
    const y = doc.y + 60
    const anchoFirma = 200
    const xTrabajador = MARGEN + 10
    const xEmpleador = MARGEN + ANCHO - 10 - anchoFirma

    doc.lineWidth(0.5)
    doc.moveTo(xTrabajador, y).lineTo(xTrabajador + anchoFirma, y).stroke()
    doc.moveTo(xEmpleador, y).lineTo(xEmpleador + anchoFirma, y).stroke()

    doc.font("Helvetica-Bold").fontSize(9)
    doc.text("TRABAJADOR", xTrabajador, y + 4, { width: anchoFirma, align: "center" })
    doc.text("EMPLEADOR", xEmpleador, y + 4, { width: anchoFirma, align: "center" })
    doc.font("Helvetica").fontSize(8)
    doc.text(`${f.trabajador.nombre}\nRUT: ${f.trabajador.rut}`, xTrabajador, y + 16, { width: anchoFirma, align: "center" })
    doc.text(`${f.empleador.nombre}\npp. ${f.empleador.representante}\nRUT: ${f.empleador.rut}`, xEmpleador, y + 16, { width: anchoFirma, align: "center" })
}

function dibujarContrato(doc, d) {
    doc.font("Helvetica-Bold").fontSize(13).text(d.titulo, MARGEN, MARGEN, { width: ANCHO, align: "center" })
    doc.moveDown(1)
    doc.font("Helvetica").fontSize(9).text(d.lugarFecha, MARGEN, doc.y, { width: ANCHO, align: "right" })
    doc.moveDown(1)

    seccion(doc, "INDIVIDUALIZACIÓN DEL EMPLEADOR:", d.empleador)
    seccion(doc, "INDIVIDUALIZACIÓN DEL TRABAJADOR:", d.trabajador)
    doc.font("Helvetica").fontSize(9).text(d.introduccion ?? "Entre las partes individualizadas se celebra el siguiente contrato de trabajo:", MARGEN, doc.y, { width: ANCHO })
    doc.moveDown(0.8)

    for (const c of d.clausulas) {
        clausula(doc, c)
    }

    firmas(doc, d.firmas)
}

module.exports = {
    dibujarContrato
}
