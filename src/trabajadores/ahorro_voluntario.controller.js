const servicio = require("./ahorro_voluntario.service.js")

async function listar(req, res) {
    res.status(200).json(await servicio.listarAhorros(req.params.personaId, req.empresasPermitidas))
}

async function registrar(req, res) {
    res.status(201).json(await servicio.registrarAhorro(req.params.personaId, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function actualizar(req, res) {
    res.status(200).json(await servicio.actualizarAhorro(req.params.personaId, req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function eliminar(req, res) {
    await servicio.eliminarAhorro(req.params.personaId, req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

module.exports = { listar, registrar, actualizar, eliminar }
