const { crearLiquidacion, listarLiquidaciones, obtenerLiquidacionPorId } = require("./liquidacion.service");

async function crear(req, res) {
    const resultado = await crearLiquidacion(
        req.params.periodoId,
        req.body?.trabajador_id,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(201).json(resultado)
}

async function listar(req, res) {
    const listaLiquidacion = await listarLiquidaciones(req.params.periodoId, req.empresasPermitidas)
    res.status(200).json(listaLiquidacion)
}

async function obtenerPorId(req, res) {
    const obtenerIdLiquidacion = await obtenerLiquidacionPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdLiquidacion)
}

module.exports = {
    crear,
    listar,
    obtenerPorId
}