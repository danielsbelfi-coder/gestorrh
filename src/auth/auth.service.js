const { Usuario } = require("../shared/associations")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { AuthenticationError } = require("../shared/errors")

const HASH_FALSO = bcrypt.hashSync("relleno", 10)


async function autenticarUsuario(email, password) {
    if (typeof password !== "string" || password.trim() === ""
        || typeof email !== "string" || email.trim() === "") {
        throw new AuthenticationError("Credenciales inválidas")
    }
    const usuario = await Usuario.unscoped().findOne({
        where: {
            email
        }
    })

    const passwordValida = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FALSO)

    if (usuario === null || passwordValida === false || usuario.estado !== "activo") {
        throw new AuthenticationError("Credenciales inválidas")
    }

    return jwt.sign(
        { sub: usuario.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )
}

module.exports = {
    autenticarUsuario
}

