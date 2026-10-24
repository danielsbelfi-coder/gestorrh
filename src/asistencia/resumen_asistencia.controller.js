const { guardarResumen, listarResumenes, aprobarResumen, devolverResumen } = require("./resumen_asistencia.service.js")

async function listar(req, res) {
    const resumenes = await listarResumenes(req.query.periodo_id, req.empresasPermitidas)
    res.status(200).json(resumenes)
}

async function guardar(req, res) {
    const { resumen, creado } = await guardarResumen(req.body ?? {}, req.empresasPermitidas, req.usuario.id)
    res.status(creado ? 201 : 200).json(resumen)
}

async function aprobar(req, res) {
    const resumen = await aprobarResumen(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(resumen)
}

async function devolver(req, res) {
    const resumen = await devolverResumen(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(200).json(resumen)
}

module.exports = {
    listar,
    guardar,
    aprobar,
    devolver
}