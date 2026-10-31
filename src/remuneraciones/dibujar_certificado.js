// Certificado N° 6 sobre sueldos y otras rentas similares (Res. Ex. SII N° 6509 de 1993), una página por persona.
const { formatearRut } = require("../shared/rut.js")
const { fechaEnTexto } = require("../shared/fechas.js")

const OPCIONES_PDF = { size: "LETTER", layout: "landscape", margin: 40 }
const MARGEN = 40
const ANCHO = 792 - MARGEN * 2
const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

const COLUMNAS = [
    { titulo: "Periodo", ancho: 56 },
    { titulo: "Sueldo bruto", valor: (m) => m.bruto },
    { titulo: "Cotización previsional o de salud de cargo del trabajador", valor: (m) => m.cotizaciones },
    { titulo: "Renta imponible afecta al impuesto único de 2ª categoría", valor: (m) => m.rentaNeta },
    { titulo: "Impuesto único retenido", valor: (m) => m.impuesto },
    { titulo: "Mayor retención de impuesto solicitada (art. 88 LIR)", valor: (m) => m.mayorRetencion },
    { titulo: "Renta total exenta", valor: (m) => m.exenta },
    { titulo: "Renta total no gravada", valor: (m) => m.noGravada },
    { titulo: "Rebaja por zonas extremas (D.L. 889)", valor: (m) => m.zonas },
    { titulo: "Factor de actualización", valor: (m) => m.factor, factor: true },
    { titulo: "Renta afecta al impuesto único", valor: (m) => m.actualizado.rentaNeta, actualizado: true },
    { titulo: "Impuesto único retenido", valor: (m) => m.actualizado.impuesto, actualizado: true },
    { titulo: "Mayor retención de impuesto solicitada", valor: (m) => m.actualizado.mayorRetencion, actualizado: true },
    { titulo: "Renta total exenta", valor: (m) => m.actualizado.exenta, actualizado: true },
    { titulo: "Renta total no gravada", valor: (m) => m.actualizado.noGravada, actualizado: true },
    { titulo: "Rebaja por zonas extremas", valor: (m) => m.actualizado.zonas, actualizado: true }
]
const ANCHO_MONTO = (ANCHO - COLUMNAS[0].ancho) / (COLUMNAS.length - 1)

const miles = (monto) => Number(monto).toLocaleString("es-CL")

function textoCelda(columna, mes) {
    const valor = columna.valor(mes)
    return columna.factor ? valor.toFixed(3).replace(".", ",") : miles(valor)
}

function dibujarCertificado(doc, { empresa, anio, fila, fechaEmision }) {
    doc.font("Helvetica-Bold").fontSize(10).text(empresa.razon_social, MARGEN, MARGEN)
    doc.font("Helvetica").fontSize(8)
        .text(`RUT ${formatearRut(empresa.rut, empresa.dv)}`)
        .text(empresa.direccion ?? "")
    if (empresa.giro) {
        doc.text(`Giro: ${empresa.giro}`)
    }
    doc.font("Helvetica-Bold").fontSize(9)
        .text(`CERTIFICADO N° ${fila.certificado}`, MARGEN, MARGEN, { width: ANCHO, align: "right" })
    doc.font("Helvetica").fontSize(8).text(`Fecha: ${fechaEnTexto(fechaEmision)}`, { width: ANCHO, align: "right" })

    doc.moveDown(2.5)
    doc.font("Helvetica-Bold").fontSize(11).text("CERTIFICADO N° 6 SOBRE SUELDOS Y OTRAS RENTAS SIMILARES", MARGEN, doc.y, { width: ANCHO, align: "center" })
    doc.moveDown(0.8)
    doc.font("Helvetica").fontSize(8.5).text(
        `${empresa.razon_social}, RUT ${formatearRut(empresa.rut, empresa.dv)}, certifica que don(ña) ${fila.nombre}, ` +
        `RUT ${formatearRut(fila.rut, fila.dv)}, en su calidad de empleado(a) dependiente, durante el año ${anio} ` +
        "se le han pagado las rentas que se indican y sobre las cuales se le practicaron las retenciones de impuesto que se señalan:",
        MARGEN, doc.y, { width: ANCHO, align: "justify" }
    )
    doc.moveDown(1)

    // Encabezado: grupo "Montos actualizados" sobre las últimas seis columnas.
    const xActualizados = MARGEN + COLUMNAS[0].ancho + ANCHO_MONTO * 9
    let y = doc.y
    doc.rect(xActualizados, y, ANCHO_MONTO * 6, 12).fillAndStroke("#e8e8e8", "#999999")
    doc.fillColor("black").font("Helvetica-Bold").fontSize(7)
        .text("MONTOS ACTUALIZADOS", xActualizados, y + 3, { width: ANCHO_MONTO * 6, align: "center" })
    y += 12
    const altoEncabezado = 44
    let x = MARGEN
    for (const columna of COLUMNAS) {
        const ancho = columna.ancho ?? ANCHO_MONTO
        doc.rect(x, y, ancho, altoEncabezado).fillAndStroke("#f2f2f2", "#999999")
        doc.fillColor("black").font("Helvetica-Bold").fontSize(5.6)
            .text(columna.titulo, x + 2, y + 3, { width: ancho - 4, align: "center" })
        x += ancho
    }
    y += altoEncabezado

    const porMes = new Map(fila.meses.map((m) => [m.mes, m]))
    const altoFila = 15
    const filaTabla = (etiqueta, celdas, negrita = false) => {
        let xx = MARGEN
        COLUMNAS.forEach((columna, indice) => {
            const ancho = columna.ancho ?? ANCHO_MONTO
            doc.rect(xx, y, ancho, altoFila).stroke("#999999")
            const texto = indice === 0 ? etiqueta : celdas[indice]
            doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(6.8)
                .text(texto, xx + 2, y + 4.5, { width: ancho - 4, align: indice === 0 ? "left" : "right" })
            xx += ancho
        })
        y += altoFila
    }

    NOMBRES_MES.forEach((nombre, indice) => {
        const mes = porMes.get(indice + 1)
        filaTabla(nombre, COLUMNAS.map((columna, i) => (i === 0 || !mes ? "" : textoCelda(columna, mes))))
    })

    const totales = COLUMNAS.map((columna, indice) => {
        if (indice === 0 || columna.factor) {
            return ""
        }
        return miles(fila.meses.reduce((suma, mes) => suma + columna.valor(mes), 0))
    })
    filaTabla("Totales", totales, true)

    doc.font("Helvetica").fontSize(7.5).text(
        "Se extiende el presente certificado en cumplimiento de lo dispuesto en la Resolución Exenta N° 6509 del Servicio de Impuestos Internos, " +
        "publicada en el Diario Oficial del 20 de diciembre de 1993, y sus modificaciones posteriores.",
        MARGEN, y + 12, { width: ANCHO, align: "justify" }
    )

    const yFirma = 612 - MARGEN - 40
    const xFirma = MARGEN + ANCHO - 220
    doc.moveTo(xFirma, yFirma).lineTo(xFirma + 220, yFirma).stroke("#000000")
    doc.font("Helvetica").fontSize(8)
        .text("Nombre, RUT y firma del empleador o representante legal", xFirma, yFirma + 4, { width: 220, align: "center" })
}

module.exports = { OPCIONES_PDF, dibujarCertificado }
