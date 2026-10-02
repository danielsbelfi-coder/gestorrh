const { Isapre } = require("../shared/associations.js");
const { NotFoundError } = require("../shared/errors.js")

async function listarIsapres() {
    return await Isapre.findAll()
}

async function obtenerIsaprePorId(id) {
    const isapre = await Isapre.findByPk(id)
    if (isapre === null) {
        throw new NotFoundError("Isapre no encontrada")
    }
    return isapre
}

module.exports = {
    listarIsapres,
    obtenerIsaprePorId
}