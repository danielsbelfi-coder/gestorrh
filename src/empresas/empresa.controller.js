const { NotFoundError, ConflictError } = require("../shared/errors.js");
const { crearEmpresa, listarEmpresas, obtenerEmpresaPorId, actualizarEmpresa, desactivarEmpresa } = require("./empresa.service.js");



async function crear(req, res) {
    try {
        const nuevaEmpresa = await crearEmpresa(req.body);

        res.status(201).json(nuevaEmpresa)


    } catch (error) {
        if (error instanceof ConflictError)
            return res.status(error.statusCode).json({ error: error.message })
        res.status(400).json({ error: error.message })
    }
}

async function listar(req, res) {
    try {
        const listaEmpresa = await listarEmpresas(req.empresasPermitidas)

        res.status(200).json(listaEmpresa)

    } catch (error) {
        res.status(500).json({
            error: error.message
        })
    }
}

async function obtenerPorId(req, res) {
    try {
        const obtenerIdEmpresa = await obtenerEmpresaPorId(req.params.id, req.empresasPermitidas)

        res.status(200).json(obtenerIdEmpresa)

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

async function actualizar(req, res) {
    try {
        const empresaActualizada = await actualizarEmpresa(req.params.id, req.body, req.empresasPermitidas)

        res.status(200).json(empresaActualizada)

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

async function desactivar(req, res) {
    try {
        const empresaInactiva = await desactivarEmpresa(req.params.id, req.empresasPermitidas)

        res.status(200).json(empresaInactiva)

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
    obtenerPorId,
    actualizar,
    desactivar
}