const { crearContrato, listarContratos, obtenerContratoPorId, firmarContrato, documentoContrato, corregirContrato, anularContrato } = require("./contrato.service");
const PDFDocument = require("pdfkit")
const { dibujarContrato } = require("./dibujar_contrato.js")

async function crear(req, res) {
    const nuevoContrato = await crearContrato(req.body, req.empresasPermitidas, req.usuario.id);
    res.status(201).json(nuevoContrato)
}

async function listar(req, res) {
    const listaContrato = await listarContratos(req.empresasPermitidas)
    res.status(200).json(listaContrato)
}

async function obtenerPorId(req, res) {
    const obtenerIdContrato = await obtenerContratoPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdContrato)
}
async function firmar(req, res) {
    const contrato = await firmarContrato(req.params.id, req.body?.fecha_firma, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(contrato)
}

async function corregir(req, res) {
    const contrato = await corregirContrato(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(contrato)
}

async function anular(req, res) {
    const contrato = await anularContrato(req.params.id, req.body?.motivo, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(contrato)
}

async function documento(req, res) {
    const datos = await documentoContrato(req.params.id, req.empresasPermitidas)
    const doc = new PDFDocument({ size: "LETTER", margin: 50 })

    res.attachment(`contrato-${req.params.id}.pdf`)
    doc.pipe(res)
    dibujarContrato(doc, datos)
    doc.end()
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    firmar,
    documento,
    corregir,
    anular
}