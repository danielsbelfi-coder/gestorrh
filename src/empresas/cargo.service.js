const { Cargo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { ConflictError, NotFoundError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")

async function crearCargo(datos, empresasPermitidas, usuarioId) {
    try {

        if (!empresasPermitidas.includes(Number(datos.empresa_id))) {
            throw new NotFoundError("Empresa no encontrada")
        }

        await exigirRol(usuarioId, Number(datos.empresa_id), PERMISOS.GESTIONAR_FICHAS)

        return await Cargo.create(datos, {
            fields: [
                "empresa_id",
                "nombre",
                "departamento_id",
                "descripcion"
            ]
        })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un cargo con ese nombre")
        }
        throw error
    }
}

async function listarCargos(empresasPermitidas) {
    return await Cargo.findAll({
        where: {
            empresa_id: { [Op.in]: empresasPermitidas }
        }
    })
}

async function obtenerCargoPorId(id, empresasPermitidas) {
    const cargo = await Cargo.findByPk(id)

    if (cargo === null || !empresasPermitidas.includes(cargo.empresa_id)) {
        throw new NotFoundError("Cargo no encontrado")
    }
    return cargo

}

async function actualizarCargo(id, datos, empresasPermitidas, usuarioId) {
    const cargo = await obtenerCargoPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, cargo.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const actualizar = await cargo.update(datos, {
        fields: ["departamento_id", "nombre", "descripcion", "estado"]
    })

    return actualizar


}

async function desactivarCargo(id, empresasPermitidas, usuarioId) {
    const cargoDesactivado = await actualizarCargo(id, { estado: "inactivo" }, empresasPermitidas, usuarioId)

    return cargoDesactivado
}

module.exports = {
    crearCargo,
    listarCargos,
    obtenerCargoPorId,
    actualizarCargo,
    desactivarCargo
}