const { Cargo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { ConflictError, NotFoundError } = require("../shared/errors.js")

async function crearCargo(datos) {
    try {
        return await Cargo.create(datos)
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

async function actualizarCargo(id, datos, empresasPermitidas) {
    const cargo = await obtenerCargoPorId(id, empresasPermitidas)

    const actualizar = await cargo.update(datos, {
        fields: ["departamento_id", "nombre", "descripcion", "estado"]
    })

    return actualizar


}

async function desactivarCargo(id, empresasPermitidas) {
    const cargoDesactivado = await actualizarCargo(id, { estado: "inactivo" }, empresasPermitidas)

    return cargoDesactivado
}

module.exports = {
    crearCargo,
    listarCargos,
    obtenerCargoPorId,
    actualizarCargo,
    desactivarCargo
}