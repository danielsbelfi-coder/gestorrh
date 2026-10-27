const { crearAsistencia, listarAsistencias, obtenerAsistenciaPorId, cambiarAprobacionAsistencia } = require("./asistencia.service");


async function crear(req, res) {
    const nuevaAsistencia = await crearAsistencia({
        ...req.body,
        usuario_registro_id: req.usuario.id
    },
        req.empresasPermitidas,
        req.usuario.id
    )
    res.status(201).json(nuevaAsistencia)
}


async function listar(req, res) {
    const listaAsistencia = await listarAsistencias(req.empresasPermitidas)
    res.status(200).json(listaAsistencia)
}

async function obtenerPorId(req, res) {
    const obtenerIdAsistencia = await obtenerAsistenciaPorId(req.params.id, req.empresasPermitidas)

    res.status(200).json(obtenerIdAsistencia)
}

async function aprobacion(req, res) {
    const asistencia = await cambiarAprobacionAsistencia(req.params.id, req.body?.estado, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(asistencia)
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    aprobacion
}