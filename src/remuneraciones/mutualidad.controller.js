const { listarMutualidades } = require("./mutualidad.service.js")

async function listar(req, res) {
    const mutualidades = await listarMutualidades()
    res.status(200).json(mutualidades)
}

module.exports = {
    listar
}
