const { NotFoundError, ForbiddenError } = require("../shared/errors.js")
const { Usuario } = require("../shared/associations")
const { generarPasswordInicial } = require("../shared/password.js")

async function actualizarUsuario(id, datos) {
    const usuarioExistente = await Usuario.findByPk(id)

    if (usuarioExistente === null) {
        throw new NotFoundError("Usuario no encontrado")
    }

    return await usuarioExistente.update(datos, {
        fields: ["nombre", "email", "estado"]
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
    const usuarioDesactivado = await actualizarUsuario(id, { estado: "inactivo" })

    return usuarioDesactivado
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