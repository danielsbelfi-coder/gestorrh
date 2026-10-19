const { Usuario, UsuarioEmpresaRol, Empresa, Rol } = require("../shared/associations.js")
const { ValidationError, ConflictError } = require("../shared/errors.js")
const { exigirCuentaActiva } = require("../shared/permisos.js")
const { generarPasswordInicial } = require("../shared/password.js")

async function listarUsuariosCuenta(usuario) {
    return await Usuario.findAll({
        where: { cuenta_id: usuario.cuenta_id },
        attributes: ["id", "nombre", "email", "estado", "es_admin_cuenta", "debe_cambiar_password"],
        include: [{
            model: UsuarioEmpresaRol,
            attributes: ["empresa_id", "estado"],
            include: [
                { model: Empresa, attributes: ["razon_social"] },
                { model: Rol, attributes: ["codigo"] }
            ]
        }],
        order: [["id", "ASC"]]
    })
}

async function crearUsuarioCuenta(datos, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    if (!datos.nombre || !datos.email)
        throw new ValidationError("Debe indicar el nombre y el email del usuario")

    const { password: passwordInicial, hash: passwordHash } = await generarPasswordInicial()

    try {
        const nuevoUsuario = await Usuario.create({
            nombre: datos.nombre,
            email: datos.email,
            password_hash: passwordHash,
            cuenta_id: usuario.cuenta_id,
            debe_cambiar_password: true
        })

        return {
            usuario: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email
            },
            passwordInicial
        }
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un usuario con ese email")
        }
        throw error
    }
}

module.exports = {
    listarUsuariosCuenta,
    crearUsuarioCuenta
}