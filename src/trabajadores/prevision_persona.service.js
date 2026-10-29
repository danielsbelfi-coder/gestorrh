// Historial de previsión (AFP y salud) por mes. Ver «Historial de previsión» en el SPEC.
const { Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { PrevisionPersona, Persona, Afp, Isapre, Liquidacion, PeriodoRemuneracion, Trabajador } = require("../shared/associations.js")
const { obtenerPersonaPorId } = require("./persona.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { DESDE_SIEMPRE, previsionDelMes, validarPrevision, normalizarPrevision, mesesCerradosAlcanzados } = require("./prevision_del_mes.js")

const INCLUIR_INSTITUCIONES = [{ model: Afp, attributes: ["id", "nombre"] }, { model: Isapre, attributes: ["id", "nombre"] }]

async function listarPrevisiones(personaId, empresasPermitidas) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    return PrevisionPersona.findAll({ where: { persona_id: persona.id }, include: INCLUIR_INSTITUCIONES, order: [["desde", "DESC"]] })
}

// Un cambio no puede alcanzar un mes cerrado en que la persona tuvo liquidación (para eso existe la reapertura).
async function exigirSinMesesCerrados(persona, desde, transaction) {
    const liquidaciones = await Liquidacion.findAll({
        where: { vigente: true },
        attributes: ["id"],
        include: [
            { model: PeriodoRemuneracion, attributes: ["anio", "mes"], where: { estado: "cerrado" }, required: true },
            { model: Trabajador, attributes: ["id"], where: { persona_id: persona.id }, required: true }
        ],
        transaction
    })
    const meses = mesesCerradosAlcanzados(desde, liquidaciones.map((l) => l.PeriodoRemuneracion))
    if (meses.length > 0) {
        const texto = meses.map((mes) => mes.split("-").reverse().join("-")).join(", ")
        throw new ConflictError(`El cambio alcanza meses ya cerrados (${texto}). Si es necesario, el administrador puede reabrir el periodo; si no, se regulariza directamente en Previred o con la isapre`)
    }
}

// Los campos de la persona guardan la previsión vigente hoy (la ficha, el contrato y la importación los leen).
async function sincronizarPersona(personaId, transaction, hoy = new Date()) {
    const filas = await PrevisionPersona.findAll({ where: { persona_id: personaId }, transaction })
    const vigente = previsionDelMes(filas, hoy.getFullYear(), hoy.getMonth() + 1)
    await Persona.update({
        afp_id: vigente?.afp_id ?? null,
        sistema_salud: vigente?.sistema_salud ?? null,
        isapre_id: vigente?.isapre_id ?? null,
        plan_isapre_uf: vigente?.plan_isapre_uf ?? null
    }, { where: { id: personaId }, transaction })
}

async function exigirInstituciones(datos) {
    const afp = await Afp.findByPk(datos.afp_id)
    if (afp === null || afp.estado === "inactivo") {
        throw new ValidationError("La AFP indicada no existe o no está activa")
    }
    if (datos.sistema_salud === "Isapre") {
        const isapre = await Isapre.findByPk(datos.isapre_id)
        if (isapre === null || isapre.estado === "inactivo") {
            throw new ValidationError("La isapre indicada no existe o no está activa")
        }
    }
}

// Registra la previsión desde un mes (AAAA-MM) o corrige la inicial (desde = "siempre").
async function registrarPrevision(personaId, datos, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const errores = validarPrevision(datos)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    const prevision = normalizarPrevision(datos)
    await exigirInstituciones(prevision)

    return sequelize.transaction(async (transaction) => {
        await exigirSinMesesCerrados(persona, prevision.desde, transaction)

        const existente = await PrevisionPersona.findOne({ where: { persona_id: persona.id, desde: prevision.desde }, transaction })
        let fila
        if (existente !== null && prevision.desde === DESDE_SIEMPRE) {
            // La previsión inicial se corrige (no se elimina).
            fila = await existente.update({ ...prevision, usuario_registro_id: usuarioId }, { transaction })
        } else if (existente !== null) {
            throw new ConflictError(`Ya hay un cambio de previsión desde ${datos.desde}; elimínelo antes de registrar otro`)
        } else {
            fila = await PrevisionPersona.create({ ...prevision, persona_id: persona.id, usuario_registro_id: usuarioId }, { transaction })
        }

        await sincronizarPersona(persona.id, transaction)
        return fila
    })
}

async function eliminarPrevision(personaId, id, empresasPermitidas, usuarioId) {
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const fila = await PrevisionPersona.findOne({ where: { id, persona_id: persona.id } })
    if (fila === null) {
        throw new NotFoundError("Cambio de previsión no encontrado")
    }
    if (fila.desde === DESDE_SIEMPRE) {
        throw new ConflictError("La previsión inicial no se elimina: se corrige registrándola de nuevo «desde siempre»")
    }

    await sequelize.transaction(async (transaction) => {
        await exigirSinMesesCerrados(persona, fila.desde, transaction)
        await fila.destroy({ transaction })
        await sincronizarPersona(persona.id, transaction)
    })
}

// Para el cálculo de un mes: { afp, sistema_salud, isapre, plan_isapre_uf } con las instituciones completas.
// Si la persona no tiene historial (no debería pasar después de la migración), se usan sus campos actuales.
async function previsionEnMes(persona, anio, mes) {
    const filas = await PrevisionPersona.findAll({
        where: { persona_id: persona.id, desde: { [Op.lte]: `${anio}-${String(mes).padStart(2, "0")}-01` } },
        include: [Afp, Isapre]
    })
    const fila = previsionDelMes(filas, anio, mes)
    if (fila === null) {
        return { afp: persona.Afp ?? null, sistema_salud: persona.sistema_salud, isapre: persona.Isapre ?? null, plan_isapre_uf: persona.plan_isapre_uf }
    }
    return { afp: fila.Afp, sistema_salud: fila.sistema_salud, isapre: fila.Isapre, plan_isapre_uf: fila.plan_isapre_uf }
}

module.exports = { listarPrevisiones, registrarPrevision, eliminarPrevision, sincronizarPersona, previsionEnMes }
