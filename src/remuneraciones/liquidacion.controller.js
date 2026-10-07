const { ConflictError, NotFoundError } = require("../shared/errors");
const { crearLiquidacion, listarLiquidaciones, obtenerLiquidacionPorId } = require("./liquidacion.service");



async function crear(req, res) {
    try {
        const nuevaLiquidacion = await crearLiquidacion(
            req.params.periodoId,
            req.body.trabajador_id,
            req.empresasPermitidas
        )

        res.status(201).json(nuevaLiquidacion)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(500).json({
            error: error.message
        })
    }
}

async function listar(req, res) {
    try {
        const listaLiquidacion = await listarLiquidaciones(req.params.periodoId, req.empresasPermitidas)

        res.status(200).json(listaLiquidacion)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdLiquidacion = await obtenerLiquidacionPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdLiquidacion)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(500).json({
            error: error.message
        })
    }
}

module.exports = {
    crear,
    listar,
    obtenerPorId
}