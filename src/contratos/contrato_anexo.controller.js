const PDFDocument = require("pdfkit")
const { crearAnexo, firmarAnexo, listarAnexos, documentoAnexo } = require("./contrato_anexo.service");
const { dibujarContrato } = require("./dibujar_contrato.js")

async function crear(req, res) {
    const nuevoAnexo = await crearAnexo({
        ...req.body,
        contrato_id: req.params.contratoId,
        usuario_creo_id: req.usuario.id
    }, req.empresasPermitidas,
        req.usuario.id
    );

    res.status(201).json(nuevoAnexo)
}

async function firmar(req, res) {
    const anexoFirmado = await firmarAnexo(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(anexoFirmado)
}


async function listar(req, res) {
    const anexos = await listarAnexos(req.params.contratoId, req.empresasPermitidas)
    res.status(200).json(anexos)
}

async function documento(req, res) {
    const datos = await documentoAnexo(req.params.contratoId, req.params.id, req.empresasPermitidas)
    const doc = new PDFDocument({ size: "LETTER", margin: 50 })
    res.attachment(`anexo-${req.params.id}-contrato-${req.params.contratoId}.pdf`)
    doc.pipe(res)
    dibujarContrato(doc, datos)
    doc.end()
}

module.exports = {
    documento,
    crear,
    firmar,
    listar
}