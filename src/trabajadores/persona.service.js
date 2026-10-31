const { Persona, Usuario, Trabajador, Afp, Isapre, PrevisionPersona } = require("../shared/associations.js")
const { DESDE_SIEMPRE } = require("./prevision_del_mes.js")
const { sequelize } = require("../shared/database.js")
const { validarImportacion, MAXIMO_FILAS } = require("./importacion_personas.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { limpiarRut, rutEsValido } = require("../shared/rut.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")



const CAMPOS_EDITABLES = ["nombres", "apellido_paterno", "apellido_materno", "nacionalidad", "fecha_nacimiento", "sexo_genero", "direccion", "telefono", "email", "estado_civil", "banco_codigo", "forma_pago", "tipo_cuenta", "numero_cuenta", "plan_isapre_codigo", "afiliado_afc"]

// La AFP y la salud se indican al crear la persona (quedan como su previsión «desde siempre»).
// Después solo cambian con el historial de previsión (prevision_persona.service.js), que mantiene estos campos al día.
const CAMPOS_PREVISION = ["afp_id", "sistema_salud", "isapre_id", "plan_isapre_uf"]

async function crearPrevisionInicial(persona, transaction) {
    await PrevisionPersona.create({
        persona_id: persona.id,
        desde: DESDE_SIEMPRE,
        afp_id: persona.afp_id ?? null,
        sistema_salud: persona.sistema_salud ?? null,
        isapre_id: persona.isapre_id ?? null,
        plan_isapre_uf: persona.plan_isapre_uf ?? null
    }, { transaction })
}

async function crearPersona(datos, empresasPermitidas, usuarioId) {
    if (!empresasPermitidas.includes(Number(datos.empresa_id))) {
        throw new NotFoundError("Empresa no encontrada")
    }

    await exigirRol(usuarioId, Number(datos.empresa_id), PERMISOS.GESTIONAR_FICHAS)

    const rut = limpiarRut(datos.rut)
    const dv = String(datos.dv).trim().toUpperCase()

    if (!rutEsValido(rut, dv)) {
        throw new ValidationError("Rut inválido")
    }
    validarDatosPago(datos)

    try {
        return await sequelize.transaction(async (transaction) => {
            const persona = await Persona.create({ ...datos, rut, dv }, {
                fields: ["empresa_id", "rut", "dv", ...CAMPOS_EDITABLES, ...CAMPOS_PREVISION],
                transaction
            })
            await crearPrevisionInicial(persona, transaction)
            return persona
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

// Banco del catálogo y forma de pago válida (vacío = sin banco).
function validarDatosPago(datos) {
    const { BANCOS, FORMAS_PAGO } = require("../shared/bancos.js")
    if (datos.banco_codigo === "") {
        datos.banco_codigo = null
    }
    if (datos.banco_codigo !== undefined && datos.banco_codigo !== null && !BANCOS[datos.banco_codigo]) {
        throw new ValidationError("El banco no está en la lista")
    }
    if (datos.forma_pago !== undefined && !FORMAS_PAGO.includes(datos.forma_pago)) {
        throw new ValidationError("La forma de pago debe ser transferencia, cheque, efectivo o vale vista")
    }
}

async function actualizarPersona(id, datos, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)
    validarDatosPago(datos)

    return await persona.update(datos, {
        fields: CAMPOS_EDITABLES
    })
}

async function importarPersonas(datos, empresasPermitidas, usuarioId) {
    const empresaId = Number(datos?.empresa_id)

    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }

    await exigirRol(usuarioId, empresaId, PERMISOS.GESTIONAR_FICHAS)

    const filas = datos.filas
    if (!Array.isArray(filas) || filas.length === 0) {
        throw new ValidationError("La planilla no tiene filas")
    }
    if (filas.length > MAXIMO_FILAS) {
        throw new ValidationError(`La planilla no puede tener más de ${MAXIMO_FILAS} filas`)
    }

    const [afps, isapres, existentes] = await Promise.all([
        Afp.findAll(),
        Isapre.findAll(),
        Persona.findAll({ where: { empresa_id: empresaId }, attributes: ["rut"] })
    ])

    const { personas, errores } = validarImportacion(filas, {
        afps,
        isapres,
        rutsExistentes: new Set(existentes.map((p) => p.rut))
    })
    const postulantes = personas.filter((p) => p.postulante !== null).length

    if (errores.length > 0 || datos.confirmar !== true) {
        return { confirmado: false, total: filas.length, postulantes, errores }
    }

    await sequelize.transaction(async (transaction) => {
        for (const { persona, postulante } of personas) {
            const creada = await Persona.create({ ...persona, empresa_id: empresaId }, {
                fields: ["empresa_id", "rut", "dv", ...CAMPOS_EDITABLES, ...CAMPOS_PREVISION],
                transaction
            })
            await crearPrevisionInicial(creada, transaction)

            if (postulante !== null) {
                await Trabajador.create({ persona_id: creada.id, empresa_id: empresaId, fecha_ingreso: postulante.fecha_ingreso }, {
                    fields: ["persona_id", "empresa_id", "fecha_ingreso"],
                    transaction
                })
            }
        }
    })

    return { confirmado: true, creadas: personas.length, postulantes, errores: [] }
}

module.exports = {
    crearPersona,
    listarPersonas,
    obtenerPersonaPorId,
    actualizarPersona,
    importarPersonas
}