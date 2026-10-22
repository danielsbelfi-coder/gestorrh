const { Usuario, Cuenta } = require("../shared/associations")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { AuthenticationError, ValidationError, ForbiddenError } = require("../shared/errors")

const HASH_FALSO = bcrypt.hashSync("relleno", 10)

function generarToken(usuarioId) {
    return jwt.sign(
        { sub: usuarioId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    )
}

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

    let cuentaCancelada = false

    if (usuario.cuenta_id !== null) {
        const cuenta = await Cuenta.findByPk(usuario.cuenta_id)

        if (cuenta.estado === "cancelada") {
            if (usuario.es_admin_cuenta !== true) {
                throw new ForbiddenError("La cuenta fue cancelada. Contacta a la plataforma para recuperar tu información")
            }

            cuentaCancelada = true
        }
    }

    const token = generarToken(usuario.id)

    return { token, debeCambiarPassword: usuario.debe_cambiar_password, cuentaCancelada }
}

async function cambiarPassword(usuarioId, passwordActual, passwordNueva) {
    if (typeof passwordActual !== "string" || passwordActual.trim() === ""
        || typeof passwordNueva !== "string" || passwordNueva.trim() === "") {
        throw new ValidationError("Debe ingresar la contraseña actual y la nueva")
    }

    if (passwordNueva.length < 8) {
        throw new ValidationError("La contraseña debe tener al menos 8 caracteres")
    }

    if (passwordNueva === passwordActual) {
        throw new ValidationError("La contraseña nueva no debe ser igual a la anterior")
    }

    const usuario = await Usuario.unscoped().findByPk(usuarioId)

    const comparacion = await bcrypt.compare(passwordActual, usuario.password_hash)

    if (comparacion === false) {
        throw new ValidationError("La contraseña actual no es correcta")
    }

    const passwordHash = await bcrypt.hash(passwordNueva, 10)

    await usuario.update({
        password_hash: passwordHash,
        debe_cambiar_password: false,
        password_cambiado_en: new Date()
    })

    return generarToken(usuario.id)
}

module.exports = {
    autenticarUsuario,
    cambiarPassword
}