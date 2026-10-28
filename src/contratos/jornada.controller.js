const { listarJornadas, crearJornada, actualizarJornada, cambiarEstadoJornada } = require("./jornada.service.js")

async function listar(req, res) {
    const jornadas = await listarJornadas(Number(req.query.empresa_id), req.empresasPermitidas)
    res.status(200).json(jornadas)
}

async function crear(req, res) {
    const { jornada, advertencias } = await crearJornada(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(201).json({ ...jornada.toJSON(), advertencias })
}

async function actualizar(req, res) {
    const { jornada, advertencias } = await actualizarJornada(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(200).json({ ...jornada.toJSON(), advertencias })
}

async function desactivar(req, res) {
    const jornada = await cambiarEstadoJornada(req.params.id, false, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(jornada)
}

async function reactivar(req, res) {
    const jornada = await cambiarEstadoJornada(req.params.id, true, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(jornada)
}

module.exports = {
    listar,
    crear,
    actualizar,
    desactivar,
    reactivar
}
