const { Op } = require("sequelize")
const { AccesoSoporte, RegistroSoporte, Empresa, Usuario, Cuenta } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { obtenerEmpresaDeCuenta } = require("../empresas/empresa.service.js")
const { generarPasswordInicial } = require("../shared/password.js")
const { HORAS_POR_DEFECTO, validarAutorizacion, validarMotivo, textoMotivo, estadoDeAcceso } = require("./acceso_soporte.js")

function condicionVigente(ahora = new Date()) {
    return { revocado_en: null, desde: { [Op.lte]: ahora }, hasta: { [Op.gt]: ahora } }
}

// Accesos que hoy permiten a soporte consultar empresas de clientes (de todas las cuentas).
async function accesosVigentes() {
    return await AccesoSoporte.findAll({
        where: condicionVigente(),
        include: [{ model: Empresa, attributes: ["id", "razon_social"], required: true }],
        order: [["hasta", "ASC"]]
    })
}

async function autorizarAcceso(body, usuario) {
    const empresa = await obtenerEmpresaDeCuenta(body.empresa_id, usuario)

    const errores = validarAutorizacion({ horas: body.horas, motivo: body.motivo })
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }

    const vigente = await AccesoSoporte.findOne({ where: { empresa_id: empresa.id, ...condicionVigente() } })
    if (vigente !== null) {
        throw new ConflictError("Ya hay un acceso vigente para esta empresa: revócalo o espera que venza")
    }

    const horas = body.horas === undefined || body.horas === null ? HORAS_POR_DEFECTO : Number(body.horas)
    const desde = new Date()
    const hasta = new Date(desde.getTime() + horas * 3600 * 1000)

    return await AccesoSoporte.create({
        cuenta_id: usuario.cuenta_id,
        empresa_id: empresa.id,
        autorizado_por_id: usuario.id,
        motivo: textoMotivo(body.motivo),
        desde,
        hasta
    })
}

function presentarAcceso(acceso, ahora = new Date()) {
    return {
        id: acceso.id,
        empresa_id: acceso.empresa_id,
        razon_social: acceso.Empresa?.razon_social ?? null,
        motivo: acceso.motivo,
        desde: acceso.desde,
        hasta: acceso.hasta,
        estado: estadoDeAcceso(acceso, ahora),
        autorizado_por: acceso.autorizadoPor?.nombre ?? null,
        revocado_en: acceso.revocado_en,
        revocado_por: acceso.revocadoPor?.nombre ?? null
    }
}

async function listarAccesosCuenta(usuario) {
    const accesos = await AccesoSoporte.findAll({
        where: { cuenta_id: usuario.cuenta_id },
        include: [
            { model: Empresa, attributes: ["id", "razon_social"] },
            { model: Usuario, as: "autorizadoPor", attributes: ["nombre"] },
            { model: Usuario, as: "revocadoPor", attributes: ["nombre"] }
        ],
        order: [["id", "DESC"]],
        limit: 200
    })

    const ahora = new Date()
    return accesos.map((acceso) => presentarAcceso(acceso, ahora))
}

async function revocarAcceso(id, usuario) {
    const acceso = await AccesoSoporte.findByPk(id)

    if (acceso === null || acceso.cuenta_id !== usuario.cuenta_id) {
        throw new NotFoundError("Autorización no encontrada")
    }

    if (estadoDeAcceso(acceso) !== "vigente") {
        throw new ConflictError("Esta autorización ya no está vigente")
    }

    await acceso.update({ revocado_en: new Date(), revocado_por_id: usuario.id })
    return presentarAcceso(acceso)
}

async function listarRegistroCuenta(usuario) {
    const filas = await RegistroSoporte.findAll({
        where: { cuenta_id: usuario.cuenta_id },
        include: [
            { model: Usuario, as: "usuario", attributes: ["nombre"] },
            { model: Empresa, attributes: ["razon_social"] }
        ],
        order: [["createdAt", "DESC"], ["id", "DESC"]],
        limit: 500
    })

    return filas.map((fila) => ({
        id: fila.id,
        fecha: fila.createdAt,
        tipo: fila.tipo,
        usuario_soporte: fila.usuario?.nombre ?? "Soporte",
        empresa: fila.Empresa?.razon_social ?? null,
        metodo: fila.metodo,
        ruta: fila.ruta,
        estado_http: fila.estado_http,
        detalle: fila.detalle
    }))
}

// Guarda una fila por acceso vigente (o una sin acceso si no había ninguno). Nunca debe romper la respuesta.
async function registrarConsulta({ usuario, accesos, metodo, ruta, estadoHttp, ip }) {
    const base = {
        tipo: "consulta",
        usuario_id: usuario.id,
        metodo: String(metodo).slice(0, 10),
        ruta: String(ruta).slice(0, 500),
        estado_http: estadoHttp,
        ip: ip ? String(ip).slice(0, 64) : null
    }

    const filas = accesos.length === 0
        ? [{ ...base, acceso_id: null, cuenta_id: null, empresa_id: null }]
        : accesos.map((acceso) => ({ ...base, acceso_id: acceso.id, cuenta_id: acceso.cuenta_id, empresa_id: acceso.empresa_id }))

    await RegistroSoporte.bulkCreate(filas)
}

async function listarCuentasSoporte() {
    const cuentas = await Cuenta.findAll({ order: [["id", "ASC"]] })
    const principales = await Usuario.findAll({
        where: { es_admin_principal: true, cuenta_id: cuentas.map((cuenta) => cuenta.id) },
        attributes: ["id", "nombre", "email", "estado", "cuenta_id"]
    })

    return cuentas.map((cuenta) => {
        const principal = principales.find((usuario) => usuario.cuenta_id === cuenta.id)
        return {
            id: cuenta.id,
            nombre: cuenta.nombre,
            estado: cuenta.estado,
            principal: principal ? { id: principal.id, nombre: principal.nombre, email: principal.email, estado: principal.estado } : null
        }
    })
}

async function restablecerPrincipal(cuentaId, body, soporte, { metodo, ruta, ip }) {
    const cuenta = await Cuenta.findByPk(cuentaId)
    if (cuenta === null) {
        throw new NotFoundError("Cuenta no encontrada")
    }

    const principal = await Usuario.findOne({ where: { cuenta_id: cuenta.id, es_admin_principal: true } })
    if (principal === null) {
        throw new NotFoundError("La cuenta no tiene administrador principal")
    }

    const errores = validarMotivo(body.motivo)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }

    const { password: passwordInicial, hash } = await generarPasswordInicial()

    await principal.update({ password_hash: hash, debe_cambiar_password: true, password_cambiado_en: new Date() })

    await RegistroSoporte.create({
        tipo: "restablecer_password",
        usuario_id: soporte.id,
        cuenta_id: cuenta.id,
        metodo,
        ruta: String(ruta).slice(0, 500),
        estado_http: 200,
        ip: ip ? String(ip).slice(0, 64) : null,
        detalle: `Contraseña de ${principal.nombre} (${principal.email}). Motivo: ${textoMotivo(body.motivo)}`
    })

    return { usuario: { id: principal.id, nombre: principal.nombre, email: principal.email }, passwordInicial }
}

module.exports = {
    accesosVigentes,
    autorizarAcceso,
    listarAccesosCuenta,
    revocarAcceso,
    listarRegistroCuenta,
    registrarConsulta,
    listarCuentasSoporte,
    restablecerPrincipal
}
