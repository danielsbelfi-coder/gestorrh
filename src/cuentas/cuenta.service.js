const { generarPasswordInicial } = require("../shared/password.js")
const { normalizarEmail, emailValido } = require("../shared/email.js")
const { exigirEmailLibre } = require("../usuarios/email_usuario.js")
const { Cuenta, Usuario, Plan } = require("../shared/associations.js")
const { sequelize } = require("../shared/database.js")
const { ValidationError, ConflictError, NotFoundError } = require("../shared/errors.js")
const { limpiarRut, rutEsValido } = require("../shared/rut.js")
const { DIAS_CONSERVACION_DATOS } = require("../shared/constantes.js")
const { sumarDias } = require("../shared/fechas.js")

async function crearCuenta(datos) {
    const rut = limpiarRut(datos.rut_titular)
    const dv = String(datos.dv_titular).trim().toUpperCase()

    if (!rutEsValido(rut, dv)) {
        throw new ValidationError("El RUT del titular no es válido")
    }

    const adminEmail = normalizarEmail(datos.admin_email)

    if (!datos.admin_nombre || adminEmail === "") {
        throw new ValidationError("Debe indicar el nombre y el email del administrador de la cuenta")
    }
    if (!emailValido(adminEmail)) {
        throw new ValidationError("El email del administrador no es válido")
    }
    await exigirEmailLibre(adminEmail)

    const planId = await validarPlan(datos.plan_id)
    const adicionales = datos.usuarios_adicionales === undefined ? 0 : validarAdicionales(datos.usuarios_adicionales)

    const { password: passwordInicial, hash: passwordHash } = await generarPasswordInicial()

    try {
        return await sequelize.transaction(async (t) => {
            const cuenta = await Cuenta.create({
                ...datos,
                rut_titular: rut,
                dv_titular: dv,
                plan_id: planId,
                usuarios_adicionales: adicionales
            }, {
                fields: [
                    "nombre",
                    "rut_titular",
                    "dv_titular",
                    "razon_social_titular",
                    "email_contacto",
                    "plan_id",
                    "usuarios_adicionales"
                ],
                transaction: t
            })

            const admin = await Usuario.create({
                nombre: datos.admin_nombre,
                email: adminEmail,
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

// Corrige el correo del administrador de una cuenta (y genera una contraseña inicial nueva) mientras
// él todavía no haya ingresado. Sirve para un correo mal escrito o una contraseña perdida antes del primer ingreso.
async function corregirAdminInicial(cuentaId, datos) {
    const cuenta = await Cuenta.findByPk(cuentaId)

    if (cuenta === null) {
        throw new NotFoundError("Cuenta no encontrada")
    }

    const admin = await Usuario.unscoped().findOne({
        where: { cuenta_id: cuenta.id, es_admin_cuenta: true, debe_cambiar_password: true, password_cambiado_en: null },
        order: [["id", "ASC"]]
    })

    const email = datos?.email === undefined ? null : normalizarEmail(datos.email)
    if (email !== null && !emailValido(email)) {
        throw new ValidationError("El email del administrador no es válido")
    }

    if (admin === null) {
        throw new ConflictError("El administrador de esta cuenta ya ingresó y cambió su contraseña: ya no se puede corregir desde aquí")
    }

    if (email !== null) {
        await exigirEmailLibre(email, admin.id)
    }

    const { password, hash } = await generarPasswordInicial()
    await admin.update({ email: email ?? admin.email, password_hash: hash, debe_cambiar_password: true, estado: "activo" })

    return { admin: { id: admin.id, nombre: admin.nombre, email: admin.email }, passwordInicial: password }
}

async function listarCuentas() {
    const cuentas = await Cuenta.findAll({
        include: { model: Plan, attributes: ["nombre"] },
        order: [["id", "ASC"]]
    })

    // Administrador que todavía no ingresó (no cambió su contraseña inicial): el comercial aún puede corregir su acceso.
    const pendientes = await Usuario.findAll({
        where: { es_admin_cuenta: true, debe_cambiar_password: true, password_cambiado_en: null, cuenta_id: cuentas.map((c) => c.id) },
        attributes: ["id", "cuenta_id", "email"],
        order: [["id", "ASC"]]
    })
    const adminInicialPorCuenta = new Map()
    for (const admin of pendientes) {
        if (!adminInicialPorCuenta.has(admin.cuenta_id)) {
            adminInicialPorCuenta.set(admin.cuenta_id, { id: admin.id, email: admin.email })
        }
    }

    return cuentas.map((cuenta) => ({
        ...cuenta.toJSON(),
        admin_inicial: adminInicialPorCuenta.get(cuenta.id) ?? null,
        fecha_eliminacion: cuenta.fecha_cancelacion && cuenta.fecha_eliminacion_datos === null
            ? sumarDias(cuenta.fecha_cancelacion, DIAS_CONSERVACION_DATOS)
            : null
    }))
}

async function listarPlanes() {
    return await Plan.findAll({
        attributes: ["id", "nombre", "max_trabajadores", "usuarios_incluidos", "activo"],
        order: [["max_trabajadores", "ASC"]]
    })
}



async function obtenerCuenta(id) {
    const cuenta = await Cuenta.findByPk(id)

    if (cuenta === null) {
        throw new NotFoundError("Cuenta no encontrada")
    }

    return cuenta
}


async function reactivarCuenta(id) {
    const cuenta = await obtenerCuenta(id)

    if (cuenta.fecha_eliminacion_datos !== null) {
        throw new ConflictError("Los datos de esta cuenta ya fueron eliminados. Para retomar el servicio hay que crear una cuenta nueva")
    }

    if (cuenta.estado === "activa") {
        throw new ConflictError("La cuenta se encuentra activa")
    }

    await cuenta.update({
        estado: "activa",
        fecha_cancelacion: null
    })

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
        throw new ValidationError(`Al cancelar, los usuarios de la cuenta perderán el acceso y sus datos se eliminarán en ${DIAS_CONSERVACION_DATOS} días si no se reactiva. ¿Confirmas la cancelación?`)
    }

    await cuenta.update({
        estado: "cancelada",
        fecha_cancelacion: new Date().toISOString().slice(0, 10)
    })

    return cuenta
}


async function cambiarPlanCuenta(id, datos) {
    const cuenta = await obtenerCuenta(id)

    if (datos.plan_id === undefined && datos.usuarios_adicionales === undefined) {
        throw new ValidationError("Debe indicar el plan, los usuarios adicionales o ambos")
    }

    const cambios = {}

    if (datos.plan_id !== undefined) {
        cambios.plan_id = await validarPlan(datos.plan_id)
    }

    if (datos.usuarios_adicionales !== undefined) {
        cambios.usuarios_adicionales = validarAdicionales(datos.usuarios_adicionales)
    }

    await cuenta.update(cambios)

    return cuenta
}

async function validarPlan(planIdCrudo) {
    const planId = Number(planIdCrudo)

    if (planIdCrudo === undefined || !Number.isInteger(planId)) {
        throw new ValidationError("Debe indicar el plan")
    }

    const plan = await Plan.findByPk(planId)

    if (plan === null || !plan.activo) {
        throw new ValidationError("El plan indicado no existe o no está disponible")
    }

    return plan.id
}

function validarAdicionales(valor) {
    const adicionales = Number(valor)

    if (!Number.isInteger(adicionales) || adicionales < 0) {
        throw new ValidationError("Los usuarios adicionales deben ser un número entero igual o mayor a 0")
    }

    return adicionales
}

module.exports = {
    corregirAdminInicial,
    crearCuenta,
    listarCuentas,
    suspenderCuenta,
    cancelarCuenta,
    reactivarCuenta,
    cambiarPlanCuenta,
    listarPlanes
}