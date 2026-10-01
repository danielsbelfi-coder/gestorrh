const { Persona, Trabajador } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js")

async function crearPersona(datos) {
    try {
        return await Persona.create(datos)        
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una persona con ese Rut")
        }
        throw error
    }
}

async function listarPersonas(empresasPermitidas) {
    const trabajadores = await Trabajador.findAll({
        where: {
            empresa_id: { [Op.in]: empresasPermitidas }
        },
        attributes: ["persona_id"]
    })

    const esosIds = trabajadores.map((trabajador) => trabajador.persona_id)

    return await Persona.findAll({
        where: {
            id: { [Op.in]: esosIds }
        }
    })
}

async function obtenerPersonaPorId(id, empresasPermitidas) {
    const persona = await Persona.findByPk(id)

    const trabajador = await Trabajador.findOne({
        where: {
            persona_id: id,
            empresa_id: { [Op.in]: empresasPermitidas }
        }
    })

    if (persona === null || trabajador === null) {
        throw new NotFoundError("Persona no encontrada")
    }

    return persona
}

async function actualizarPersona(id, datos, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(id, empresasPermitidas)

    const actualizar = await persona.update(datos, {
        fields: ["nombres", "apellido_paterno", "apellido_materno", "nacionalidad", "fecha_nacimiento", "sexo_genero", "direccion", "telefono", "email", "estado_civil", "banco", "tipo_cuenta", "numero_cuenta", "afp_id", "sistema_salud", "isapre_id", "plan_isapre_codigo", "afiliado_afc"]
    })

    return actualizar
}

module.exports = {
    crearPersona,
    listarPersonas,
    obtenerPersonaPorId,
    actualizarPersona
}