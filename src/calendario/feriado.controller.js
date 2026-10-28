const { listarFeriados, crearFeriado, actualizarFeriado, eliminarFeriado } = require("./feriado.service.js")

async function listar(req, res) {
    res.status(200).json(await listarFeriados({ anio: req.query.anio, comuna: req.query.comuna }))
}

async function crear(req, res) {
    res.status(201).json(await crearFeriado(req.body))
}

async function actualizar(req, res) {
    res.status(200).json(await actualizarFeriado(req.params.id, req.body ?? {}))
}

async function eliminar(req, res) {
    await eliminarFeriado(req.params.id)
    res.status(204).end()
}

module.exports = { listar, crear, actualizar, eliminar }
