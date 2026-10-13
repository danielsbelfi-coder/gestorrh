const { listarAfps, obtenerAfpPorId } = require("./afp.service.js");

async function listar(req, res) {
    const listaAfp = await listarAfps()
    res.status(200).json(listaAfp)
}

async function obtenerPorId(req, res) {
    const obtenerIdAfp = await obtenerAfpPorId(req.params.id)
    res.status(200).json(obtenerIdAfp)
}

module.exports = {
    listar,
    obtenerPorId
}