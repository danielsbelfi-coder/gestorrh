const { Mutualidad } = require("../shared/associations.js")

// Catálogo de mutualidades (organismos administradores de la Ley 16.744). Solo las activas se pueden asignar a una empresa.
async function listarMutualidades() {
    return await Mutualidad.findAll({
        order: [["nombre", "ASC"]]
    })
}

module.exports = {
    listarMutualidades
}
