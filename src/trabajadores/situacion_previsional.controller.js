const { crearSituacion, listarSituaciones, eliminarSituacion } = require("./situacion_previsional.service.js")

async function crear(req, res) {
    const situacion = await crearSituacion(req.params.personaId, req.body, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(situacion)
}

async function listar(req, res) {
    const situaciones = await listarSituaciones(req.params.personaId, req.empresasPermitidas)
    res.status(200).json(situaciones)
}

async function eliminar(req, res) {
    await eliminarSituacion(req.params.personaId, req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

module.exports = {
    crear,
    listar,
    eliminar
}