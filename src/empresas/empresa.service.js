const { Empresa } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")

async function crearEmpresa(datos) {
    try {
        return await Empresa.create(datos)
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una empresa con ese Rut")
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

    const actualizar = await empresa.update(datos, {
        fields: ["razon_social", "nombre_fantasia", "representante_legal_nombre", "representante_legal_rut", "direccion", "mutualidad_id"]
    })

    return actualizar
}

async function desactivarEmpresa(id, empresasPermitidas) {
    const empresa = await obtenerEmpresaPorId(id, empresasPermitidas)

    await empresa.update({
        estado: "inactiva"
    })

    return empresa
}

module.exports = {
    crearEmpresa,
    listarEmpresas,
    obtenerEmpresaPorId,
    actualizarEmpresa,
    desactivarEmpresa
}