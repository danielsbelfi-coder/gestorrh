const { NotFoundError, ConflictError } = require("../shared/errors");
const { abrirPeriodo, cerrarPeriodo, listarPeriodos, obtenerPeriodoPorId } = require("./periodo_remuneracion.service");


async function crear(req, res) {
    try {
        const nuevoPeriodo = await abrirPeriodo(req.body, req.empresasPermitidas)

        res.status(201).json(nuevoPeriodo)

    } catch (error) {
        if (error instanceof ConflictError || error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({ error: error.message })
    }
}

async function cerrar(req, res) {
    try {
        const periodoCerrado = await cerrarPeriodo(req.params.id, req.empresasPermitidas)

        res.status(200).json(periodoCerrado)

    } catch (error) {
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })

        res.status(400).json({ error: error.message })
    }
}

async function listar(req, res) {
    try {
        const listaPeriodo = await listarPeriodos(req.empresasPermitidas)

        res.status(200).json(listaPeriodo)

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

async function obtenerPorId(req, res) {
    try {
        const obtenerIdPeriodo = await obtenerPeriodoPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdPeriodo)

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
    cerrar,
    listar,
    obtenerPorId
}