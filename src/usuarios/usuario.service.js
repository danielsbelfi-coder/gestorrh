const { ValidationError, ConflictError, NotFoundError, ForbiddenError } = require("../shared/errors.js")
const { Usuario } = require("../shared/associations")
const { generarPasswordInicial } = require("../shared/password.js")
const bcrypt = require("bcrypt")

async function crearUsuario(datos) {
    try {
        if (typeof datos.password !== "string" || datos.password.trim() === "") {
            throw new ValidationError("La contraseña es obligatoria")
        }
        const passwordHash = await bcrypt.hash(datos.password, 10)

        const nuevoUsuario = await Usuario.create({
            nombre: datos.nombre,
            email: datos.email,
            estado: datos.estado,
            password_hash: passwordHash
        })

        return nuevoUsuario

    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un usuario con ese email")
        }
        throw error
    }
}

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
        debe_cambiar_password: true
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
    crearUsuario,
    actualizarUsuario,
    listarUsuarios,
    obtenerUsuarioPorId,
    desactivarUsuario,
    restablecerPasswordSoporte
}