const { NotFoundError, ValidationError, ConflictError } = require("../shared/errors");
const { crearUsuario, listarUsuarios, obtenerUsuarioPorId, actualizarUsuario, desactivarUsuario } = require("./usuario.service");


async function crear(req, res) {
    try {
        const usuarioNuevo = await crearUsuario(req.body)

        res.status(201).json(usuarioNuevo)

    } catch (error) {
        if (error instanceof ValidationError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({ error: error.message })
    }
}

async function listar(req, res) {
    try {
        const listaUsuario = await listarUsuarios()

        res.status(200).json(listaUsuario)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdUsuario = await obtenerUsuarioPorId(req.params.id)

        res.status(200).json(obtenerIdUsuario)

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
        const usuarioActualizado = await actualizarUsuario(req.params.id, req.body)

        res.status(200).json(usuarioActualizado)

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
        const usuarioInactivo = await desactivarUsuario(req.params.id)

        res.status(200).json(usuarioInactivo)

    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })

        res.status(400).json({
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