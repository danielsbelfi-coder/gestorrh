const servicio = require("./turno_conduccion.service.js")

async function listarTipos(req, res) {
    res.status(200).json(await servicio.listarTiposEspera(Number(req.query.empresa_id), req.empresasPermitidas))
}

async function crearTipo(req, res) {
    res.status(201).json(await servicio.crearTipoEspera(req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function actualizarTipo(req, res) {
    res.status(200).json(await servicio.actualizarTipoEspera(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function listar(req, res) {
    res.status(200).json(await servicio.turnosDelMes(req.query, req.empresasPermitidas))
}

async function trabajadores(req, res) {
    res.status(200).json(await servicio.trabajadoresConTurnos(req.query, req.empresasPermitidas))
}

async function crear(req, res) {
    const { turno, alertas } = await servicio.crearTurno(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(201).json({ ...turno.toJSON(), alertas })
}

async function crearLote(req, res) {
    res.status(201).json(await servicio.crearTurnosEnLote(req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function actualizar(req, res) {
    const { turno, alertas } = await servicio.actualizarTurno(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(200).json({ ...turno.toJSON(), alertas })
}

async function eliminar(req, res) {
    await servicio.eliminarTurno(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

async function aprobar(req, res) {
    res.status(200).json(await servicio.aprobarTurno(req.params.id, req.empresasPermitidas, req.usuario.id))
}

async function aprobarMes(req, res) {
    res.status(200).json(await servicio.aprobarMes(req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

module.exports = { listarTipos, crearTipo, actualizarTipo, listar, trabajadores, crear, crearLote, actualizar, eliminar, aprobar, aprobarMes }
