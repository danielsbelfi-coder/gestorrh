// Cargas familiares y tramo de asignación familiar de cada persona. Ver «Cargas familiares y asignación familiar» en el SPEC.
const { Op } = require("sequelize")
const { CargaFamiliar, TramoAsignacionPersona, Liquidacion, PeriodoRemuneracion, Trabajador } = require("../shared/associations.js")
const { obtenerPersonaPorId } = require("./persona.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const {
    tramoDelMes, cargasDelMes, validarTramo, normalizarTramo, validarCarga, normalizarCarga, mesesCerradosEnRango
} = require("../remuneraciones/asignacion_familiar.js")

async function personaParaEditar(personaId, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)
    return persona
}

function exigirValidos(errores) {
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
}

// Meses cerrados en que la persona tuvo liquidación y que caen en el rango. No bloquean: esas liquidaciones no cambian
// y la diferencia se paga como asignación retroactiva; la pantalla lo avisa.
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

// ---------- Tramo ----------

async function listarTramos(personaId, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    return TramoAsignacionPersona.findAll({ where: { persona_id: persona.id }, order: [["desde", "DESC"]] })
}

async function registrarTramo(personaId, datos, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    exigirValidos(validarTramo(datos))
    const tramo = normalizarTramo(datos)

    const existente = await TramoAsignacionPersona.findOne({ where: { persona_id: persona.id, desde: tramo.desde } })
    if (existente !== null) {
        throw new ConflictError(`Ya hay un tramo registrado desde ${datos.desde}; elimínelo antes de registrar otro`)
    }

    let fila
    try {
        fila = await TramoAsignacionPersona.create({ ...tramo, persona_id: persona.id, usuario_registro_id: usuarioId })
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError(`Ya hay un tramo registrado desde ${datos.desde}; elimínelo antes de registrar otro`)
        }
        throw error
    }
    return { ...fila.toJSON(), meses_cerrados: await mesesCerradosAlcanzados(persona, tramo.desde, null) }
}

async function eliminarTramo(personaId, id, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    const fila = await TramoAsignacionPersona.findOne({ where: { id, persona_id: persona.id } })
    if (fila === null) {
        throw new NotFoundError("Tramo no encontrado")
    }
    await fila.destroy()
}

// ---------- Cargas ----------

async function listarCargas(personaId, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    return CargaFamiliar.findAll({ where: { persona_id: persona.id }, order: [["desde", "DESC"], ["id", "DESC"]] })
}

async function registrarCarga(personaId, datos, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    exigirValidos(validarCarga(datos))
    const carga = normalizarCarga(datos)

    const fila = await CargaFamiliar.create({ ...carga, persona_id: persona.id, usuario_registro_id: usuarioId })
    return { ...fila.toJSON(), meses_cerrados: await mesesCerradosAlcanzados(persona, carga.desde, carga.hasta) }
}

async function buscarCarga(persona, id) {
    const fila = await CargaFamiliar.findOne({ where: { id, persona_id: persona.id } })
    if (fila === null) {
        throw new NotFoundError("Carga familiar no encontrada")
    }
    return fila
}

// Corrige una carga (por ejemplo, la fecha de término de un documento renovado). Se reemplazan todos sus datos.
async function actualizarCarga(personaId, id, datos, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    const fila = await buscarCarga(persona, id)
    exigirValidos(validarCarga(datos))
    const carga = normalizarCarga(datos)

    const antes = { desde: fila.desde, hasta: fila.hasta }
    await fila.update({ ...carga, usuario_registro_id: usuarioId })

    // Se avisan los meses cerrados que tocaba la carga antes o después del cambio.
    const meses = [...new Set([
        ...await mesesCerradosAlcanzados(persona, antes.desde, antes.hasta),
        ...await mesesCerradosAlcanzados(persona, carga.desde, carga.hasta)
    ])].sort()
    return { ...fila.toJSON(), meses_cerrados: meses }
}

async function eliminarCarga(personaId, id, empresasPermitidas, usuarioId) {
    const persona = await personaParaEditar(personaId, empresasPermitidas, usuarioId)
    const fila = await buscarCarga(persona, id)
    await fila.destroy()
}

// ---------- Para el cálculo ----------

// El tramo y las cargas de la persona en un mes: { tramo: "A".."D" | null, cargas: [...] }.
async function asignacionEnMes(personaId, anio, mes) {
    const primerDia = `${anio}-${String(mes).padStart(2, "0")}-01`
    const tramos = await TramoAsignacionPersona.findAll({ where: { persona_id: personaId, desde: { [Op.lte]: primerDia } } })
    const cargas = await CargaFamiliar.findAll({ where: { persona_id: personaId } })
    return {
        tramo: tramoDelMes(tramos, anio, mes)?.tramo ?? null,
        cargas: cargasDelMes(cargas.map((c) => c.toJSON()), anio, mes)
    }
}

module.exports = {
    listarTramos,
    registrarTramo,
    eliminarTramo,
    listarCargas,
    registrarCarga,
    actualizarCarga,
    eliminarCarga,
    asignacionEnMes
}
