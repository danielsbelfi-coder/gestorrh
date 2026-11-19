const {
    crearRecurrente, listarRecurrentes, editarRecurrente, eliminarRecurrente, saldosAlTermino
} = require("./variable_recurrente.service.js")

async function listar(req, res) {
    res.status(200).json(await listarRecurrentes(req.query.empresa_id, req.empresasPermitidas))
}

async function crear(req, res) {
    res.status(201).json(await crearRecurrente(req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function editar(req, res) {
    res.status(200).json(await editarRecurrente(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function eliminar(req, res) {
    await eliminarRecurrente(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

async function saldos(req, res) {
    res.status(200).json(await saldosAlTermino(req.params.trabajadorId, req.empresasPermitidas))
}

module.exports = { listar, crear, editar, eliminar, saldos }
