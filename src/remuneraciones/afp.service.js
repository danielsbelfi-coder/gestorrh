const { Afp } = require("../shared/associations.js");
const { NotFoundError } = require("../shared/errors.js")

async function listarAfps() {
    return await Afp.findAll()
}

async function obtenerAfpPorId(id) {
    const afp = await Afp.findByPk(id)
    if (afp === null) {
        throw new NotFoundError("AFP no encontrada")
    }
    return afp
}

module.exports = {
    listarAfps,
    obtenerAfpPorId
}