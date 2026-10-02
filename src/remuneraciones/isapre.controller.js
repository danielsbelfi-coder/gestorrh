const { NotFoundError } = require("../shared/errors.js");
const { listarIsapres, obtenerIsaprePorId } = require("./isapre.service.js");

async function listar(req, res) {
    try {
        const listaIsapre = await listarIsapres()

        res.status(200).json(listaIsapre)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdIsapre = await obtenerIsaprePorId(req.params.id)

        res.status(200).json(obtenerIdIsapre)

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