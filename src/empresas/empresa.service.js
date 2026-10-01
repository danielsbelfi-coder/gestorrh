const { Empresa } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js")

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
                id: { [Op.in]: empresasPermitidas}
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

async function actualizarEmpresa(id, datos, empresasPermitidas) {
    const empresa = await obtenerEmpresaPorId(id, empresasPermitidas)

    const actualizar = await empresa.update(datos, {
        fields: ["razon_social", "nombre_fantasia", "representante_legal_nombre", "representante_legal_rut", "direccion", "mutualidad_id", "estado" ]
    })

    return actualizar
}

async function desactivarEmpresa(id, empresasPermitidas) {
    const empresaDesactivada = await actualizarEmpresa(id, { estado: "inactiva" }, empresasPermitidas)

    return empresaDesactivada
}

module.exports = {
    crearEmpresa,
    listarEmpresas,
    obtenerEmpresaPorId,
    actualizarEmpresa,
    desactivarEmpresa
}