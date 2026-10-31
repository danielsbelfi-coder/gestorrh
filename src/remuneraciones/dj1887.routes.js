const express = require("express")
const PDFDocument = require("pdfkit")
const { resumenDj1887, archivoDj1887Empresa, certificadosDj1887 } = require("./dj1887.service.js")
const { OPCIONES_PDF, dibujarCertificado } = require("./dibujar_certificado.js")
const router = express.Router()

// DJ 1887 de una empresa y año (?empresa_id&anio). Ver «DJ 1887 (sueldos) y Certificado N° 6» en el SPEC.
router.get("/", async (req, res) => {
    res.status(200).json(await resumenDj1887(req.query ?? {}, req.empresasPermitidas, req.usuario.id))
})

// Archivo para el Importador de Datos del SII: CSV (MS-DOS), solo números y letras.
router.get("/archivo", async (req, res) => {
    const { nombre, contenido, avisos } = await archivoDj1887Empresa(req.query ?? {}, req.empresasPermitidas, req.usuario.id)
    res.attachment(nombre)
    res.set("Content-Type", "text/csv; charset=windows-1252")
    res.set("X-Advertencias", encodeURIComponent(JSON.stringify(avisos)))
    res.send(Buffer.from(contenido, "latin1"))
})

// Certificados N° 6 en PDF: todos los del año o el de una persona (?persona_id).
router.get("/certificados", async (req, res) => {
    const { empresa, anio, filas } = await certificadosDj1887(req.query ?? {}, req.empresasPermitidas, req.usuario.id)
    const fechaEmision = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
    const doc = new PDFDocument(OPCIONES_PDF)
    const sufijo = filas.length === 1 ? `-${filas[0].rut}` : ""
    res.attachment(`certificados-sueldos-${anio}${sufijo}.pdf`)
    doc.pipe(res)
    filas.forEach((fila, indice) => {
        if (indice > 0) {
            doc.addPage()
        }
        dibujarCertificado(doc, { empresa, anio, fila, fechaEmision })
    })
    doc.end()
})

module.exports = router
