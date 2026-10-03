const { ConflictError, NotFoundError } = require("../shared/errors");
const { crearTrabajador, listarTrabajadores, obtenerTrabajadorPorId, actualizarTrabajador, desactivarTrabajador } = require("./trabajador.service");


async function crear(req, res) {
    try {
        const nuevoTrabajador = await crearTrabajador(req.body, req.empresasPermitidas);

        res.status(201).json(nuevoTrabajador)


    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({ error: error.message })

        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({ error: error.message })
        
        res.status(400).json({
            error: error.message
        })
    }
}

async function listar(req, res) {
    try {
        const listaTRabajador = await listarTrabajadores(req.empresasPermitidas)

        res.status(200).json(listaTRabajador)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdTrabajador = await obtenerTrabajadorPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdTrabajador)

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
        const trabajadorActualizado = await actualizarTrabajador(req.params.id, req.body, req.empresasPermitidas)

        res.status(200).json(trabajadorActualizado)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({ error: error.message })
    }

}

async function desactivar(req, res) {
    try {
        const trabajadorInactivo = await desactivarTrabajador(req.params.id, req.empresasPermitidas)

        res.status(200).json(trabajadorInactivo)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })

        res.status(500).json({
            error: error.message
        }
        )
    }
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    actualizar,
    desactivar
}