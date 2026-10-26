const { crearLicencia } = require("./licencia_medica.service.js")

async function crear(req, res) {
    const licencia = await crearLicencia(req.body, req.empresasPermitidas, req.usuario.id)
    res.status(201).json(licencia)
}

module.exports = {
    crear
}