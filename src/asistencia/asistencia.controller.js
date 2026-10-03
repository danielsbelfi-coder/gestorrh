const { NotFoundError, ConflictError } = require("../shared/errors");
const { crearAsistencia, listarAsistencias, obtenerAsistenciaPorId } = require("./asistencia.service");


async function crear(req, res) {
    try {
        const nuevaAsistencia = await crearAsistencia({
            ...req.body,
            usuario_registro_id: req.usuario.id
        },
            req.empresasPermitidas
        )

        res.status(201).json(nuevaAsistencia)


    } catch (error) {
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({
            error: error.message
        })
    }
}


async function listar(req, res) {
    try {
        const listaAsistencia = await listarAsistencias(req.empresasPermitidas)

        res.status(200).json(listaAsistencia)

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
        const obtenerIdAsistencia = await obtenerAsistenciaPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdAsistencia)

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