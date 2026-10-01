const { NotFoundError } = require("../shared/errors");
const { crearContrato, listarContratos, obtenerContratoPorId } = require("./contrato.service");



async function crear(req, res) {
    try {
        const nuevoContrato = await crearContrato(req.body);

        res.status(201).json(nuevoContrato)


    } catch (error) {
        res.status(400).json({
            error: error.message
        })
    }
}

async function listar(req, res) {
    try {
        const listaContrato = await listarContratos(req.empresasPermitidas)

        res.status(200).json(listaContrato)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdContrato = await obtenerContratoPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdContrato)

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