const { listarIsapres, obtenerIsaprePorId } = require("./isapre.service.js");

async function listar(req, res) {
    const listaIsapre = await listarIsapres()
    res.status(200).json(listaIsapre)
}

async function obtenerPorId(req, res) {
    const obtenerIdIsapre = await obtenerIsaprePorId(req.params.id)
    res.status(200).json(obtenerIdIsapre)
}

module.exports = {
    listar,
    obtenerPorId
}