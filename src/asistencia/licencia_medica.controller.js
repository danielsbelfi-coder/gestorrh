const { crearLicencia, listarLicencias, eliminarLicencia } = require("./licencia_medica.service.js")

async function crear(req, res) {
    const licencia = await crearLicencia(req.body, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(licencia)
}

async function listar(req, res) {
    const licencias = await listarLicencias(req.query.trabajador_id, req.empresasPermitidas)
    res.status(200).json(licencias)
}

async function eliminar(req, res) {
    await eliminarLicencia(req.params.id, req.empresasPermitidas, req.usuario.id)
    res.status(204).end()
}

module.exports = {
    crear,
    listar,
    eliminar
}