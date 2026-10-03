const { ConflictError, NotFoundError } = require("../shared/errors");
const { crearCargo, listarCargos, obtenerCargoPorId, actualizarCargo, desactivarCargo } = require("./cargo.service");


async function crear(req, res) {
    try {
        const nuevoCargo = await crearCargo(req.body, req.empresasPermitidas);

        res.status(201).json(nuevoCargo)


    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({ error: error.message })
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({ error: error.message })
        res.status(400).json({ error: error.message })
    }
}

async function listar(req, res) {
    try {
        const listaCargo = await listarCargos(req.empresasPermitidas)

        res.status(200).json(listaCargo)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdCargo = await obtenerCargoPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdCargo)

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
        const cargoActualizado = await actualizarCargo(req.params.id, req.body, req.empresasPermitidas)

        res.status(200).json(cargoActualizado)

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
        const cargoInactivo = await desactivarCargo(req.params.id, req.empresasPermitidas)

        res.status(200).json(cargoInactivo)

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