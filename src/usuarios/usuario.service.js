const { NotFoundError, ForbiddenError, ConflictError, ValidationError } = require("../shared/errors.js")
const { Usuario } = require("../shared/associations")
const { generarPasswordInicial } = require("../shared/password.js")
const { normalizarEmail, emailValido } = require("../shared/email.js")
const { exigirEmailLibre } = require("./email_usuario.js")

async function actualizarUsuario(id, datos) {
    const usuarioExistente = await Usuario.findByPk(id)

    if (usuarioExistente === null) {
        throw new NotFoundError("Usuario no encontrado")
    }

    datos = { ...datos }
    if ("email" in datos) {
        datos.email = normalizarEmail(datos.email)
        if (!emailValido(datos.email)) {
            throw new ValidationError("El email no es válido")
        }
        await exigirEmailLibre(datos.email, usuarioExistente.id)
    }

    return await usuarioExistente.update(datos, {
        fields: ["nombre", "email"]
    })
}

async function listarUsuarios() {
    return await Usuario.findAll()
}

async function obtenerUsuarioPorId(id) {
    const usuario = await Usuario.findByPk(id)

    if (usuario === null) {
        throw new NotFoundError("Usuario no encontrado")
    }

    return usuario
}

async function desactivarUsuario(id) {
    const usuario = await obtenerUsuarioPorId(id)

    if (usuario.estado === "inactivo") {
        throw new ConflictError("El usuario ya está inactivo")
    }

    return await usuario.update({ estado: "inactivo" })
}

async function restablecerPasswordSoporte(id) {
    const usuario = await obtenerUsuarioPorId(id)

    if (usuario.cuenta_id === null) {
        throw new ForbiddenError("Solo se puede restablecer la contraseña de usuarios de una cuenta")
    }

    const { password: passwordInicial, hash: passwordHash } = await generarPasswordInicial()

    await usuario.update({
        password_hash: passwordHash,
        debe_cambiar_password: true,
        password_cambiado_en: new Date()
    })

    return {
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            email: usuario.email
        },
        passwordInicial
    }
}

module.exports = {
    actualizarUsuario,
    listarUsuarios,
    obtenerUsuarioPorId,
    desactivarUsuario,
    restablecerPasswordSoporte
}