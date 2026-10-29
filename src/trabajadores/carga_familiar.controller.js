const servicio = require("./carga_familiar.service.js")

async function listarTramos(req, res) {
    res.status(200).json(await servicio.listarTramos(req.params.personaId, req.empresasPermitidas))
}

async function registrarTramo(req, res) {
    res.status(201).json(await servicio.registrarTramo(req.params.personaId, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function eliminarTramo(req, res) {
    await servicio.eliminarTramo(req.params.personaId, req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

async function listarCargas(req, res) {
    res.status(200).json(await servicio.listarCargas(req.params.personaId, req.empresasPermitidas))
}

async function registrarCarga(req, res) {
    res.status(201).json(await servicio.registrarCarga(req.params.personaId, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function actualizarCarga(req, res) {
    res.status(200).json(await servicio.actualizarCarga(req.params.personaId, req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function eliminarCarga(req, res) {
    await servicio.eliminarCarga(req.params.personaId, req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

module.exports = { listarTramos, registrarTramo, eliminarTramo, listarCargas, registrarCarga, actualizarCarga, eliminarCarga }
