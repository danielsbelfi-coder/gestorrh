const { fn, col, where } = require("sequelize")
const { Usuario } = require("../shared/associations.js")
const { ConflictError } = require("../shared/errors.js")

// Busca un usuario por correo sin distinguir mayúsculas (hay cuentas antiguas guardadas con mayúsculas).
function condicionEmail(email) {
    return where(fn("lower", col("email")), String(email).trim().toLowerCase())
}

async function exigirEmailLibre(email, exceptoId = null) {
    const existente = await Usuario.unscoped().findOne({ where: condicionEmail(email), attributes: ["id"] })

    if (existente !== null && existente.id !== exceptoId) {
        throw new ConflictError("Ya existe un usuario con ese email")
    }
}

module.exports = { condicionEmail, exigirEmailLibre }
