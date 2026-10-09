const { ConflictError, NotFoundError } = require("../shared/errors");
const { crearPersona, listarPersonas, obtenerPersonaPorId, actualizarPersona } = require("./persona.service");

async function crear(req, res) {
    try {
        const nuevaPersona = await crearPersona(req.body, req.empresasPermitidas);

        res.status(201).json(nuevaPersona)

    } catch (error) {
        if (error instanceof ConflictError || error instanceof NotFoundError)
            return res.status(error.statusCode).json({ error: error.message })
        res.status(400).json({
            error: error.message
        })
    }
}

async function listar(req, res) {
    try {
        const listaPersona = await listarPersonas(req.empresasPermitidas)

        res.status(200).json(listaPersona)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdPersona = await obtenerPersonaPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdPersona)

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

async function actualizar(req, res) {
    try {
        const personaActualizada = await actualizarPersona(req.params.id, req.body, req.empresasPermitidas)

        res.status(200).json(personaActualizada)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({ error: error.message })
    }

}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar
}