const { ValidationError, ConflictError, NotFoundError } = require("../shared/errors.js")
const { Usuario } = require("../shared/associations")
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

    const datosActualizados = {
        ...datos
    }

    const campos = ["nombre", "email", "estado"]

    if (datos.password) {
        datosActualizados.password_hash = await bcrypt.hash(datos.password, 10)
        delete datosActualizados.password
        campos.push("password_hash")
    }
    
    return await usuarioExistente.update(datosActualizados, {
        fields: campos
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

module.exports = {
    crearUsuario,
    actualizarUsuario,
    listarUsuarios,
    obtenerUsuarioPorId,
    desactivarUsuario
}