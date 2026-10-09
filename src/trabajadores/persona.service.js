const { Persona } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { limpiarRut, rutEsValido } = require("../shared/rut.js")



const CAMPOS_EDITABLES = ["nombres", "apellido_paterno", "apellido_materno", "nacionalidad", "fecha_nacimiento", "sexo_genero", "direccion", "telefono", "email", "estado_civil", "banco", "tipo_cuenta", "numero_cuenta", "afp_id", "sistema_salud", "isapre_id", "plan_isapre_codigo", "plan_isapre_uf", "afiliado_afc"]

async function crearPersona(datos, empresasPermitidas) {
    if (!empresasPermitidas.includes(Number(datos.empresa_id))) {
        throw new NotFoundError("Empresa no encontrada")
    }

    const rut = limpiarRut(datos.rut)
    const dv = String(datos.dv).trim().toUpperCase()

    if (!rutEsValido(rut, dv)) {
        throw new ValidationError("Rut inválido")
    }

    try {
        return await Persona.create({...datos, rut, dv}, {
            fields: ["empresa_id", "rut", "dv", ...CAMPOS_EDITABLES]
        })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una persona con ese RUT en esta empresa")
        }
        throw error
    }
}

async function listarPersonas(empresasPermitidas) {
    return await Persona.findAll({
        where: {
            empresa_id: { [Op.in]: empresasPermitidas }
        },
        attributes: ["id", "empresa_id", "rut", "dv", "nombres", "apellido_paterno", "apellido_materno"]
    })
}

async function obtenerPersonaPorId(id, empresasPermitidas) {
    const persona = await Persona.findByPk(id)

    if (persona === null || !empresasPermitidas.includes(persona.empresa_id)) {
        throw new NotFoundError("Persona no encontrada")
    }

    return persona
}

async function actualizarPersona(id, datos, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(id, empresasPermitidas)

    return await persona.update(datos, {
        fields: CAMPOS_EDITABLES
    })
}

module.exports = {
    crearPersona,
    listarPersonas,
    obtenerPersonaPorId,
    actualizarPersona
}