const { listarPendientes } = require("./pendiente.service.js")

async function listar(req, res) {
    res.status(200).json(await listarPendientes(req.usuario, req.empresasPermitidas))
}

module.exports = { listar }
