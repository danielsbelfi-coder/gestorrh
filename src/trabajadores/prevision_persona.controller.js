const servicio = require("./prevision_persona.service.js")

async function listar(req, res) {
    res.status(200).json(await servicio.listarPrevisiones(req.params.personaId, req.empresasPermitidas))
}

async function registrar(req, res) {
    res.status(201).json(await servicio.registrarPrevision(req.params.personaId, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function eliminar(req, res) {
    await servicio.eliminarPrevision(req.params.personaId, req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

module.exports = { listar, registrar, eliminar }
