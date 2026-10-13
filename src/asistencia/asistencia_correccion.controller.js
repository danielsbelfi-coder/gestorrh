const { crearCorreccion, aprobarCorreccion } = require("./asistencia_correccion.service");


async function crear(req, res) {
    const nuevaCorreccion = await crearCorreccion({
        ...req.body,
        asistencia_id: req.params.asistenciaId,
        usuario_solicito_id: req.usuario.id
    }, req.empresasPermitidas,
        req.usuario.id);

    res.status(201).json(nuevaCorreccion)
}

async function aprobar(req, res) {
    const correccionAprobada = await aprobarCorreccion(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(correccionAprobada)
}

module.exports = {
    crear,
    aprobar
}