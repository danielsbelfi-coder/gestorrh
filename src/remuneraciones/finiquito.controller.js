const PDFDocument = require("pdfkit")
const { dibujarFiniquito } = require("./dibujar_finiquito.js")

const { calcularFiniquito, obtenerFiniquito, emitirFiniquito, pagarFiniquito, documentoFiniquito } = require("./finiquito.service.js")

async function calcular(req, res) {
    const finiquito = await calcularFiniquito(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(finiquito)
}

async function obtener(req, res) {
    const finiquito = await obtenerFiniquito(req.query.trabajador_id, req.empresasPermitidas)
    res.status(200).json(finiquito)
}

async function emitir(req, res) {
    const finiquito = await emitirFiniquito(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(finiquito)
}

async function pagar(req, res) {
    const finiquito = await pagarFiniquito(req.params.id, req.body?.fecha_pago, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(finiquito)
}

async function documento(req, res) {
    const datos = await documentoFiniquito(req.params.id, req.empresasPermitidas)
    const doc = new PDFDocument({ size: "LETTER", margin: 40 })

    res.attachment(`finiquito-${req.params.id}.pdf`)
    doc.pipe(res)
    dibujarFiniquito(doc, datos)
    doc.end()
}

module.exports = {
    calcular,
    obtener,
    emitir,
    pagar,
    documento
}