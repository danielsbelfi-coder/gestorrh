const { crearAsistencia, listarAsistencias, obtenerAsistenciaPorId } = require("./asistencia.service");


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

module.exports = {
    crear,
    listar,
    obtenerPorId
}