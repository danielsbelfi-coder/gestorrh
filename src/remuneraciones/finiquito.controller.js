const { calcularFiniquito, obtenerFiniquito, emitirFiniquito, pagarFiniquito } = require("./finiquito.service.js")

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

module.exports = {
    calcular,
    obtener,
    emitir,
    pagar
}