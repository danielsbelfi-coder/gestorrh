const { NotFoundError } = require("../shared/errors.js");
const { listarAfps, obtenerAfpPorId } = require("./afp.service.js");

async function listar(req, res) {
    try {
        const listaAfp = await listarAfps()

        res.status(200).json(listaAfp)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdAfp = await obtenerAfpPorId(req.params.id)

        res.status(200).json(obtenerIdAfp)

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
    listar,
    obtenerPorId
}