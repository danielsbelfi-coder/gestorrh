const { crearLiquidacion, listarLiquidaciones, obtenerLiquidacionPorId, recalcularLiquidacion, emitirLiquidacion, emitirLiquidacionesPeriodo } = require("./liquidacion.service");

async function crear(req, res) {
    const resultado = await crearLiquidacion(
        req.params.periodoId,
        req.body?.trabajador_id,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(resultado.reemplazada ? 200 : 201).json(resultado)
}

async function listar(req, res) {
    const listaLiquidacion = await listarLiquidaciones(req.params.periodoId, req.empresasPermitidas)
    res.status(200).json(listaLiquidacion)
}

async function obtenerPorId(req, res) {
    const obtenerIdLiquidacion = await obtenerLiquidacionPorId(req.params.id, req.empresasPermitidas)
    res.status(200).json(obtenerIdLiquidacion)
}

async function recalcular(req, res) {
    const resultado = await recalcularLiquidacion(
        req.params.periodoId,
        req.params.id,
        req.body?.motivo,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(201).json(resultado)
}

async function emitir(req, res) {
    const liquidacion = await emitirLiquidacion(
        req.params.periodoId,
        req.params.id,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(200).json(liquidacion)
}

async function emitirPeriodo(req, res) {
    const resultado = await emitirLiquidacionesPeriodo(
        req.params.periodoId,
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(resultado.problemas.length > 0 ? 409 : 200).json(resultado)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    recalcular,
    emitir,
    emitirPeriodo
}