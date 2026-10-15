const crypto = require("crypto")
const bcrypt = require("bcrypt")
const { Cuenta, Usuario } = require("../shared/associations.js")
const { sequelize } = require("../shared/database.js")
const { ValidationError, ConflictError, NotFoundError } = require("../shared/errors.js")
const { limpiarRut, rutEsValido } = require("../shared/rut.js")
const { DIAS_CONSERVACION_DATOS } = require("../shared/constantes.js")



async function crearCuenta(datos) {
    const rut = limpiarRut(datos.rut_titular)
    const dv = String(datos.dv_titular).trim().toUpperCase()

    if (!rutEsValido(rut, dv)) {
        throw new ValidationError("El RUT del titular no es válido")
    }

    if (!datos.admin_nombre || !datos.admin_email) {
        throw new ValidationError("Debe indicar el nombre y el email del administrador de la cuenta")
    }

    const passwordInicial = crypto.randomBytes(9).toString("base64url")
    const passwordHash = await bcrypt.hash(passwordInicial, 10)

    try {
        return await sequelize.transaction(async (t) => {
            const cuenta = await Cuenta.create({
                ...datos,
                rut_titular: rut,
                dv_titular: dv
            }, {
                fields: [
                    "nombre",
                    "rut_titular",
                    "dv_titular",
                    "razon_social_titular",
                    "email_contacto"
                ],
                transaction: t
            })

            const admin = await Usuario.create({
                nombre: datos.admin_nombre,
                email: datos.admin_email,
                password_hash: passwordHash,
                cuenta_id: cuenta.id,
                es_admin_cuenta: true,
                debe_cambiar_password: true
            }, { transaction: t })

            return {
                cuenta,
                admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
                passwordInicial: passwordInicial
            }
        })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un usuario con ese email")
        }
        throw error
    }
}

async function listarCuentas() {
    return await Cuenta.findAll({ order: [["id", "ASC"]] })
}

async function obtenerCuenta(id) {
    const cuenta = await Cuenta.findByPk(id)

    if (cuenta === null) {
        throw new NotFoundError("Cuenta no encontrada")
    }

    return cuenta
}


async function suspenderCuenta(id) {
    const cuenta = await obtenerCuenta(id)

    if (cuenta.estado !== "activa") {
        throw new ConflictError("Solo se puede suspender una cuenta activa")
    }

    await cuenta.update({ estado: "suspendida" })

    return cuenta
}

async function cancelarCuenta(id, confirmar) {
    const cuenta = await obtenerCuenta(id)

    if (cuenta.estado === "cancelada") {
        throw new ConflictError("La cuenta ya se encuentra cancelada")
    }

    if (confirmar !== true) {
        throw new ValidationError(`Al cancelar, los usuarios de la cuenta perderán el acceso y sus datos se eliminarán en ${DIAS_CONSERVACION_DATOS} días si no se reactiva. Para continuar, envía confirmar: true`)
    }

    await cuenta.update({
        estado: "cancelada",
        fecha_cancelacion: new Date().toISOString().slice(0, 10)
    })

    return cuenta
}

async function reactivarCuenta(id) {
    const cuenta = await obtenerCuenta(id)

    if (cuenta.estado === "activa") {
        throw new ConflictError("La cuenta se encuentra activa")
    }

    await cuenta.update({
        estado: "activa",
        fecha_cancelacion: null
    })

    return cuenta
}

module.exports = {
    crearCuenta,
    listarCuentas,
    suspenderCuenta,
    cancelarCuenta,
    reactivarCuenta
}