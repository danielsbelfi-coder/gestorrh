const { Usuario, UsuarioEmpresaRol, Empresa, Rol } = require("../shared/associations.js")
const { ValidationError, ConflictError, NotFoundError, ForbiddenError } = require("../shared/errors.js")
const { exigirCuentaActiva } = require("../shared/permisos.js")
const { generarPasswordInicial } = require("../shared/password.js")
const { obtenerEmpresaDeCuenta } = require("../empresas/empresa.service.js")
const { verificarCupoUsuarios } = require("../cuentas/consumo.service.js")

async function obtenerUsuarioCuenta(id, usuario) {
    const objetivo = await Usuario.findByPk(id)

    if (objetivo === null || objetivo.cuenta_id !== usuario.cuenta_id) {
        throw new NotFoundError("Usuario no encontrado")
    }

    return objetivo
}

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

    await verificarCupoUsuarios(usuario.cuenta_id)

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

async function desactivarUsuarioCuenta(id, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    const objetivo = await obtenerUsuarioCuenta(id, usuario)

    if (objetivo.id === usuario.id) {
        throw new ForbiddenError("No puedes desactivar tu propio usuario")
    }

    if (objetivo.estado === "inactivo") {
        throw new ConflictError("El usuario ya está inactivo")
    }

    await objetivo.update({
        estado: "inactivo"
    })
    return objetivo
}

async function reactivarUsuarioCuenta(id, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    const objetivo = await obtenerUsuarioCuenta(id, usuario)

    if (objetivo.estado === "activo") {
        throw new ConflictError("El usuario ya está activo")
    }

    await verificarCupoUsuarios(usuario.cuenta_id)

    await objetivo.update({
        estado: "activo"
    })

    return objetivo
}

async function editarUsuarioCuenta(id, datos, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    const objetivo = await obtenerUsuarioCuenta(id, usuario)

    try {
        await (objetivo.update(datos, {
            fields: [
                "nombre",
                "email"
            ]
        }))

        return objetivo

    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un usuario con ese email")
        }
        throw error
    }

}

async function cambiarAdminCuenta(id, esAdmin, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    if (typeof esAdmin !== "boolean") {
        throw new ValidationError("Debe indicar es_admin_cuenta como true o false")
    }

    const objetivo = await obtenerUsuarioCuenta(id, usuario)

    if (objetivo.id === usuario.id && esAdmin === false) {
        throw new ForbiddenError("No puedes quitarte tu propio permiso de administrador")
    }

    if (objetivo.es_admin_cuenta === esAdmin) {
        throw new ConflictError(esAdmin ? "El usuario ya es administrador de la cuenta" : "El usuario no es administrador de la cuenta")
    }

    await objetivo.update({
        es_admin_cuenta: esAdmin
    })

    return objetivo
}

async function asignarRolEmpresa(id, empresaId, codigoRol, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    if (!codigoRol) {
        throw new ValidationError("Debe indicar el rol")
    }

    const objetivo = await obtenerUsuarioCuenta(id, usuario)
    const empresa = await obtenerEmpresaDeCuenta(empresaId, usuario)

    const rol = await Rol.findOne({ where: { codigo: codigoRol } })

    if (rol === null) {
        throw new ValidationError("El rol indicado no existe")
    }

    const vinculo = await UsuarioEmpresaRol.findOne({
        where: { usuario_id: objetivo.id, empresa_id: empresa.id }
    })

    if (vinculo === null) {
        return await UsuarioEmpresaRol.create({
            usuario_id: objetivo.id,
            empresa_id: empresa.id,
            rol_id: rol.id,
            estado: "activo"
        })
    }

    await vinculo.update({ rol_id: rol.id, estado: "activo" })
    return vinculo
}

async function quitarRolEmpresa(id, empresaId, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    const objetivo = await obtenerUsuarioCuenta(id, usuario)
    const empresa = await obtenerEmpresaDeCuenta(empresaId, usuario)

    const vinculo = await UsuarioEmpresaRol.findOne({
        where: { usuario_id: objetivo.id, empresa_id: empresa.id }
    })

    if (vinculo === null) {
        throw new NotFoundError("El usuario no tiene un rol en esta empresa")
    }

    if (vinculo.estado === "inactivo") {
        throw new ConflictError("El rol en esta empresa ya fue quitado")
    }

    await vinculo.update({ estado: "inactivo" })
    return vinculo
}

async function restablecerPasswordCuenta(id, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    const objetivo = await obtenerUsuarioCuenta(id, usuario)

    if (objetivo.id === usuario.id) {
        throw new ForbiddenError("Para cambiar tu propia contraseña usa la opción Cambiar contraseña")
    }

    const { password: passwordInicial, hash: passwordHash } = await generarPasswordInicial()

    await objetivo.update({
        password_hash: passwordHash,
        debe_cambiar_password: true,
        password_cambiado_en: new Date()
    })

    return {
        usuario: { id: objetivo.id, nombre: objetivo.nombre, email: objetivo.email },
        passwordInicial
    }
}

module.exports = {
    listarUsuariosCuenta,
    crearUsuarioCuenta,
    desactivarUsuarioCuenta,
    reactivarUsuarioCuenta,
    editarUsuarioCuenta,
    cambiarAdminCuenta,
    asignarRolEmpresa,
    quitarRolEmpresa,
    restablecerPasswordCuenta
}