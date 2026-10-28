const { crearAsistencia, listarAsistencias, obtenerAsistenciaPorId, cambiarAprobacionAsistencia, editarAsistencia, eliminarAsistencia, aprobarMes } = require("./asistencia.service");
const { obtenerLibro } = require("./libro_asistencia.service");


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

// GET /api/asistencias/libro?trabajador_id=&anio=&mes=
async function libro(req, res) {
    res.status(200).json(await obtenerLibro(req.query, req.empresasPermitidas))
}

async function aprobacion(req, res) {
    const asistencia = await cambiarAprobacionAsistencia(req.params.id, req.body?.estado, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(asistencia)
}

async function editar(req, res) {
    res.status(200).json(await editarAsistencia(req.params.id, req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

async function eliminar(req, res) {
    await eliminarAsistencia(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

// POST /api/asistencias/aprobar-mes { trabajador_id, anio, mes }
async function aprobarDelMes(req, res) {
    res.status(200).json(await aprobarMes(req.body ?? {}, req.empresasPermitidas, req.usuario.id))
}

module.exports = {
    crear,
    listar,
    obtenerPorId,
    aprobacion,
    libro,
    editar,
    eliminar,
    aprobarDelMes
}