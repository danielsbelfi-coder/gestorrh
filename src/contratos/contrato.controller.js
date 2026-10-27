const { crearContrato, listarContratos, obtenerContratoPorId, firmarContrato } = require("./contrato.service");



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

module.exports = {
    crear,
    listar,
    obtenerPorId,
    firmar
}