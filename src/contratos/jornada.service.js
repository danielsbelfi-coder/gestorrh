const { Jornada, ContratoTrabajo } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { validarJornada } = require("./jornada_legal.js")

function hoyChile() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
}

function validarNombre(nombre) {
    const texto = String(nombre ?? "").trim()
    if (texto === "" || texto.length > 80) {
        throw new ValidationError("El nombre de la jornada es obligatorio y no puede superar los 80 caracteres")
    }
    return texto
}

// Valida los días contra el máximo legal de hoy; devuelve los campos calculados y las advertencias.
function camposDeDias(dias) {
    const resultado = validarJornada(dias, hoyChile())
    if (resultado.errores.length > 0) {
        throw new ValidationError(resultado.errores.join(". "))
    }
    return {
        campos: { dias: resultado.dias, horas_semanales: resultado.horasSemanales, dias_trabajados: resultado.diasTrabajados },
        advertencias: resultado.advertencias
    }
}

async function listarJornadas(empresaId, empresasPermitidas) {
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    return await Jornada.findAll({ where: { empresa_id: empresaId }, order: [["nombre", "ASC"]] })
}

async function obtenerJornadaPermitida(id, empresasPermitidas) {
    const jornada = await Jornada.findByPk(id)
    if (jornada === null || !empresasPermitidas.includes(jornada.empresa_id)) {
        throw new NotFoundError("Jornada no encontrada")
    }
    return jornada
}

async function crearJornada(datos, empresasPermitidas, usuarioId) {
    const empresaId = Number(datos?.empresa_id)
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    await exigirRol(usuarioId, empresaId, PERMISOS.GESTIONAR_FICHAS)

    const nombre = validarNombre(datos.nombre)
    const { campos, advertencias } = camposDeDias(datos.dias)

    try {
        const jornada = await Jornada.create({ empresa_id: empresaId, nombre, tipo: "semanal", ...campos })
        return { jornada, advertencias }
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una jornada con ese nombre en la empresa")
        }
        throw error
    }
}

// Si la jornada ya está asignada a contratos, sus días no se cambian: cambiar el horario de un contrato
// requiere un anexo, así que se crea otra jornada y se asigna con anexo. El nombre sí se puede cambiar.
async function actualizarJornada(id, datos, empresasPermitidas, usuarioId) {
    const jornada = await obtenerJornadaPermitida(id, empresasPermitidas)
    await exigirRol(usuarioId, jornada.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const cambios = {}
    let advertencias = []

    if (datos?.nombre !== undefined) {
        cambios.nombre = validarNombre(datos.nombre)
    }
    if (datos?.dias !== undefined) {
        const enUso = await ContratoTrabajo.count({ where: { jornada_id: jornada.id } })
        if (enUso > 0) {
            throw new ConflictError(`La jornada está asignada a ${enUso} contrato(s): su horario no se puede cambiar. Crea una jornada nueva y asígnala con un anexo.`)
        }
        const resultado = camposDeDias(datos.dias)
        Object.assign(cambios, resultado.campos)
        advertencias = resultado.advertencias
    }

    try {
        return { jornada: await jornada.update(cambios), advertencias }
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe una jornada con ese nombre en la empresa")
        }
        throw error
    }
}

async function cambiarEstadoJornada(id, activo, empresasPermitidas, usuarioId) {
    const jornada = await obtenerJornadaPermitida(id, empresasPermitidas)
    await exigirRol(usuarioId, jornada.empresa_id, PERMISOS.GESTIONAR_FICHAS)
    if (jornada.activo === activo) {
        throw new ConflictError(activo ? "La jornada ya está activa" : "La jornada ya está inactiva")
    }
    return await jornada.update({ activo })
}

module.exports = {
    listarJornadas,
    obtenerJornadaPermitida,
    crearJornada,
    actualizarJornada,
    cambiarEstadoJornada
}
