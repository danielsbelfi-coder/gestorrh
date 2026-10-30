// APV individual, APV colectivo y depósito convenido de cada persona. Ver «CCAF, APV y depósito convenido» en el SPEC.
const { AhorroVoluntario, Liquidacion, PeriodoRemuneracion, Trabajador } = require("../shared/associations.js")
const { obtenerPersonaPorId } = require("./persona.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { validarAhorro, normalizarAhorro, ahorrosDelMes, seCruzan, mesesCerradosEnRango, NOMBRES_TIPO } = require("../remuneraciones/ahorro_voluntario.js")

async function personaParaEditar(personaId, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)
    return persona
}

// Meses cerrados con liquidación de la persona dentro del rango: no bloquean, se avisan (esas liquidaciones no cambian).
async function mesesCerradosAlcanzados(persona, desde, hasta) {
    const liquidaciones = await Liquidacion.findAll({
        where: { vigente: true },
        attributes: ["id"],
        include: [
            { model: PeriodoRemuneracion, attributes: ["anio", "mes"], where: { estado: "cerrado" }, required: true },
            { model: Trabajador, attributes: ["id"], where: { persona_id: persona.id }, required: true }
        ]
    })
    return mesesCerradosEnRango(desde, hasta, liquidaciones.map((l) => l.PeriodoRemuneracion))
}

function exigirValidos(datos) {
    const errores = validarAhorro(datos)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    return normalizarAhorro(datos)
}

// Un solo ahorro de cada tipo por mes: Previred tiene un bloque para cada uno.
async function exigirSinCruce(persona, ahorro, idActual = null) {
    const otros = await AhorroVoluntario.findAll({ where: { persona_id: persona.id, tipo: ahorro.tipo } })
    const cruce = otros.find((otro) => otro.id !== idActual && seCruzan(otro.toJSON(), ahorro))
    if (cruce) {
        const hasta = cruce.hasta ? cruce.hasta.slice(0, 7) : "sin término"
        throw new ConflictError(`Ya hay un ${NOMBRES_TIPO[ahorro.tipo]} vigente en esos meses (${cruce.desde.slice(0, 7)} a ${hasta}). Indique el mes hasta del anterior antes de registrar el nuevo`)
    }
}

async function listarAhorros(personaId, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    return AhorroVoluntario.findAll({ where: { persona_id: persona.id }, order: [["desde", "DESC"], ["id", "DESC"]] })
}

async function registrarAhorro(personaId, datos, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    const ahorro = exigirValidos(datos)
    await exigirSinCruce(persona, ahorro)
    const fila = await AhorroVoluntario.create({ ...ahorro, persona_id: persona.id, usuario_registro_id: usuarioId })
    return { ...fila.toJSON(), meses_cerrados: await mesesCerradosAlcanzados(persona, ahorro.desde, ahorro.hasta) }
}

async function buscarAhorro(persona, id) {
    const fila = await AhorroVoluntario.findOne({ where: { id, persona_id: persona.id } })
    if (fila === null) {
        throw new NotFoundError("Ahorro voluntario no encontrado")
    }
    return fila
}

// Corrige un ahorro (por ejemplo, para indicar su mes de término). Se reemplazan todos sus datos.
async function actualizarAhorro(personaId, id, datos, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    const fila = await buscarAhorro(persona, id)
    const ahorro = exigirValidos(datos)
    await exigirSinCruce(persona, ahorro, fila.id)

    const antes = { desde: fila.desde, hasta: fila.hasta }
    await fila.update({ ...ahorro, usuario_registro_id: usuarioId })
    const meses = [...new Set([
        ...await mesesCerradosAlcanzados(persona, antes.desde, antes.hasta),
        ...await mesesCerradosAlcanzados(persona, ahorro.desde, ahorro.hasta)
    ])].sort()
    return { ...fila.toJSON(), meses_cerrados: meses }
}

async function eliminarAhorro(personaId, id, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    const fila = await buscarAhorro(persona, id)
    await fila.destroy()
}

// Para el cálculo: los ahorros de la persona vigentes en el mes.
async function ahorrosEnMes(personaId, anio, mes) {
    const filas = await AhorroVoluntario.findAll({ where: { persona_id: personaId } })
    return ahorrosDelMes(filas.map((f) => f.toJSON()), anio, mes)
}

module.exports = { listarAhorros, registrarAhorro, actualizarAhorro, eliminarAhorro, ahorrosEnMes }
