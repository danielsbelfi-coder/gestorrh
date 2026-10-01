const { NotFoundError, ConflictError } = require("../shared/errors");
const { crearCorreccion, aprobarCorreccion } = require("./asistencia_correccion.service");


async function crear(req, res) {
    try {
        const nuevaCorreccion = await crearCorreccion({
            ...req.body,
            asistencia_id: req.params.asistenciaId
        }, req.empresasPermitidas);

        res.status(201).json(nuevaCorreccion)


    } catch (error) {
        if (error instanceof NotFoundError)
            return res.status(error.statusCode).json({
                error: error.message
            })
        res.status(400).json({
            error: error.message
        })

    }
}

async function aprobar(req, res) {
    try {
        const correccionAprobada = await aprobarCorreccion(req.params.id, req.empresasPermitidas)
        res.status(200).json(correccionAprobada)

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

module.exports = {
    crear,
    aprobar
}