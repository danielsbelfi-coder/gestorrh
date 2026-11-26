// Paquete AG: catálogo de ex-cajas de previsión (IPS, ex INP) y sus tasas con vigencia.
const { Op } = require("sequelize")
const { ExCajaRegimen, TasaExCaja } = require("../shared/associations.js")
const { NotFoundError, ValidationError, ConflictError } = require("../shared/errors.js")
const { esFechaValida } = require("../shared/fechas.js")

// Tasa vigente de un régimen en una fecha (null si no hay).
async function tasaVigente(exCajaRegimenId, fecha, transaction) {
    return await TasaExCaja.findOne({
        where: { ex_caja_regimen_id: exCajaRegimenId, desde: { [Op.lte]: fecha } },
        order: [["desde", "DESC"]],
        transaction
    })
}

// Catálogo con la tasa vigente hoy (o en la fecha indicada).
async function listarExCajas(fecha) {
    const dia = esFechaValida(fecha) ? fecha : new Date().toISOString().slice(0, 10)
    const cajas = await ExCajaRegimen.findAll({ order: [["codigo_lre", "ASC"]] })
    const tasas = await TasaExCaja.findAll({ where: { desde: { [Op.lte]: dia } }, order: [["desde", "DESC"]] })
    return cajas.map((c) => {
        const tasa = tasas.find((t) => t.ex_caja_regimen_id === c.id) ?? null
        return { ...c.toJSON(), tasa: tasa && { desde: tasa.desde, tasa_prevision: Number(tasa.tasa_prevision), tasa_desahucio: Number(tasa.tasa_desahucio), fuente: tasa.fuente } }
    })
}

async function historialTasas(id) {
    const caja = await ExCajaRegimen.findByPk(id)
    if (caja === null) {
        throw new NotFoundError("Ex-caja no encontrada")
    }
    return { ...caja.toJSON(), tasas: await TasaExCaja.findAll({ where: { ex_caja_regimen_id: caja.id }, order: [["desde", "DESC"]] }) }
}

// Registra una tasa desde un mes (solo soporte). Desahucio: solo si el régimen tiene código de desahucio.
async function registrarTasa(id, datos) {
    const caja = await ExCajaRegimen.findByPk(id)
    if (caja === null) {
        throw new NotFoundError("Ex-caja no encontrada")
    }
    const desde = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(datos?.desde ?? "")) ? `${datos.desde}-01` : null
    if (desde === null) {
        throw new ValidationError("Indica el mes desde el que rige (AAAA-MM)")
    }
    const leer = (valor) => Number(String(valor ?? "").replace(",", "."))
    const prevision = leer(datos.tasa_prevision)
    const desahucio = datos.tasa_desahucio === undefined || datos.tasa_desahucio === "" || datos.tasa_desahucio === null ? 0 : leer(datos.tasa_desahucio)
    if (!Number.isFinite(prevision) || prevision <= 0 || prevision >= 50) {
        throw new ValidationError("La tasa de previsión debe ser un porcentaje mayor que 0 y menor que 50 (sin el desahucio)")
    }
    if (!Number.isFinite(desahucio) || desahucio < 0 || desahucio >= 20) {
        throw new ValidationError("La tasa de desahucio debe ser un porcentaje entre 0 y 20")
    }
    if (desahucio > 0 && !caja.codigo_desahucio) {
        throw new ConflictError("Este régimen no tiene código de desahucio en Previred (tabla N° 15)")
    }
    const existente = await TasaExCaja.findOne({ where: { ex_caja_regimen_id: caja.id, desde } })
    const campos = { tasa_prevision: prevision, tasa_desahucio: desahucio, fuente: String(datos.fuente ?? "").trim().slice(0, 255) || null }
    return existente ? await existente.update(campos) : await TasaExCaja.create({ ex_caja_regimen_id: caja.id, desde, ...campos })
}

module.exports = { tasaVigente, listarExCajas, historialTasas, registrarTasa }
