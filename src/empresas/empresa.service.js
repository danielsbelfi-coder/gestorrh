const { Empresa, Rol, UsuarioEmpresaRol, Mutualidad } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { exigirRol, PERMISOS, exigirCuentaActiva } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ForbiddenError, ValidationError } = require("../shared/errors.js")
const { sequelize } = require("../shared/database.js")
const { DIAS_CONSERVACION_DATOS } = require("../shared/constantes.js")
const { limpiarRut, rutEsValido } = require("../shared/rut.js")
const { sumarDias } = require("../shared/fechas.js")

const TASA_ADICIONAL_MUTUAL_MAXIMA = 20

async function validarMutualidad(datos) {
    const id = datos.mutualidad_id

    if (id !== undefined && id !== null) {
        const mutualidad = /^\d+$/.test(String(id)) ? await Mutualidad.findByPk(id) : null

        if (mutualidad === null || mutualidad.estado !== "activo") {
            throw new ValidationError("La mutualidad indicada no existe o no está activa")
        }
    }

    const tasa = datos.tasa_adicional_mutual

    if (tasa !== undefined) {
        const esNumero = (typeof tasa === "number" || typeof tasa === "string") && tasa !== "" && Number.isFinite(Number(tasa))

        if (!esNumero || Number(tasa) < 0 || Number(tasa) > TASA_ADICIONAL_MUTUAL_MAXIMA) {
            throw new ValidationError(`La tasa adicional de la mutualidad debe ser un número entre 0 y ${TASA_ADICIONAL_MUTUAL_MAXIMA}`)
        }
    }
}

async function crearEmpresa(datos, usuario) {
    await exigirCuentaActiva(usuario.cuenta_id)

    const rut = limpiarRut(datos.rut)
    const dv = String(datos.dv).trim().toUpperCase()

    if (!rutEsValido(rut, dv)) {
        throw new ValidationError("El RUT de la empresa no es válido")
    }

    await validarMutualidad(datos)

    const rolAdmin = await Rol.findOne({
        where: {
            codigo: "ADMIN"
        }
    })

    try {
        return await sequelize.transaction(async (t) => {
            const empresa = await Empresa.create({
                ...datos,
                rut: rut,
                dv: dv,
                cuenta_id: usuario.cuenta_id
            }, {
                fields: ["cuenta_id",
                    "rut",
                    "dv",
                    "razon_social",
                    "nombre_fantasia",
                    "representante_legal_nombre",
                    "representante_legal_rut",
                    "direccion",
                    "mutualidad_id",
                    "tasa_adicional_mutual"
                ],

                transaction: t
            }
            )

            await UsuarioEmpresaRol.create({
                usuario_id: usuario.id,
                empresa_id: empresa.id,
                rol_id: rolAdmin.id,
                estado: "activo",
            }, {
                transaction: t
            })

            return empresa
        })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una empresa con ese RUT en esta cuenta")
        }
        throw error
    }
}

async function listarEmpresas(empresasPermitidas) {
    return await Empresa.findAll({
        where: {
            id: { [Op.in]: empresasPermitidas }
        }
    })
}

async function obtenerEmpresaPorId(id, empresasPermitidas) {
    const empresa = await Empresa.findByPk(id)

    if (empresa === null || !empresasPermitidas.includes(Number(id))) {
        throw new NotFoundError("Empresa no encontrada")
    }
    return empresa
}

async function actualizarEmpresa(id, datos, empresasPermitidas, usuarioId) {
    const empresa = await obtenerEmpresaPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, empresa.id, PERMISOS.EDITAR_EMPRESA)

    await validarMutualidad(datos)

    const actualizar = await empresa.update(datos, {
        fields: ["razon_social", "nombre_fantasia", "representante_legal_nombre", "representante_legal_rut", "direccion", "mutualidad_id", "tasa_adicional_mutual"]
    })

    return actualizar
}

async function obtenerEmpresaDeCuenta(id, usuario) {
    const empresa = await Empresa.findByPk(id)

    if (empresa === null || empresa.cuenta_id !== usuario.cuenta_id) {
        throw new NotFoundError("Empresa no encontrada")
    }

    return empresa
}

async function desactivarEmpresa(id, usuario, confirmar) {
    const empresa = await obtenerEmpresaDeCuenta(id, usuario)

    await exigirCuentaActiva(usuario.cuenta_id)

    if (empresa.estado === "inactiva") {
        throw new ConflictError("La empresa ya está inactiva")
    }

    if (confirmar !== true) {
        throw new ValidationError(`Al desactivar, la empresa quedará en solo lectura y sus datos se eliminarán en ${DIAS_CONSERVACION_DATOS} días si no se reactiva. ¿Confirmas la desactivación?`)
    }

    await empresa.update({
        estado: "inactiva",
        fecha_desactivacion: new Date().toISOString().slice(0, 10)
    })

    return empresa
}

async function reactivarEmpresa(id, usuario) {
    const empresa = await obtenerEmpresaDeCuenta(id, usuario)

    await exigirCuentaActiva(usuario.cuenta_id)

    if (empresa.estado === "activa") {
        throw new ConflictError("La empresa ya está activa")
    }

    await empresa.update({
        estado: "activa",
        fecha_desactivacion: null
    })

    return empresa
}

async function listarEmpresasCuenta(usuario) {
    const empresas = await Empresa.findAll({
        where: { cuenta_id: usuario.cuenta_id },
        attributes: ["id", "rut", "dv", "razon_social", "estado", "fecha_desactivacion"],
        order: [["razon_social", "ASC"]]
    })

    return empresas.map((empresa) => ({
        ...empresa.toJSON(),
        fecha_eliminacion: empresa.fecha_desactivacion
            ? sumarDias(empresa.fecha_desactivacion, DIAS_CONSERVACION_DATOS)
            : null
    }))
}

module.exports = {
    crearEmpresa,
    listarEmpresas,
    obtenerEmpresaPorId,
    actualizarEmpresa,
    desactivarEmpresa,
    reactivarEmpresa,
    obtenerEmpresaDeCuenta,
    listarEmpresasCuenta
}