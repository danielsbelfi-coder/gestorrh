// Saldo de pago en exceso pendiente de relaciones anteriores de una persona. Ver «Saldo pendiente de una relación
// anterior» en el SPEC.
const { Op } = require("sequelize")
const { Finiquito, Trabajador, VariablePeriodo, ConceptoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { saldoPendiente } = require("./saldo_relaciones.js")

const CODIGO_DESCUENTO = "DESCUENTO_PAGO_EXCESO"

// { finiquitos, descontado, pendiente } de la persona en la empresa. excluirVariableId: para revisar una edición.
async function saldosDePersona(personaId, empresaId, { excluirVariableId = null } = {}) {
    const relaciones = await Trabajador.findAll({ where: { persona_id: personaId, empresa_id: empresaId }, attributes: ["id", "fecha_ingreso", "fecha_termino"] })
    const ids = relaciones.map((r) => r.id)
    if (ids.length === 0) {
        return { finiquitos: [], descontado: 0, pendiente: 0 }
    }
    const porId = new Map(relaciones.map((r) => [r.id, r]))

    const finiquitos = (await Finiquito.findAll({ where: { trabajador_id: { [Op.in]: ids }, estado: { [Op.in]: ["emitido", "pagado"] } } }))
        .filter((f) => Number(f.detalle_calculo?.saldoPagoExceso?.noRecuperado ?? 0) > 0)
        .map((f) => ({
            finiquito_id: f.id,
            trabajador_id: f.trabajador_id,
            desde: porId.get(f.trabajador_id)?.fecha_ingreso ?? null,
            hasta: porId.get(f.trabajador_id)?.fecha_termino ?? null,
            fecha_finiquito: f.fecha_finiquito,
            no_recuperado: Number(f.detalle_calculo.saldoPagoExceso.noRecuperado),
            cerrado: f.saldo_no_cobrar_en ? { motivo: f.saldo_no_cobrar_motivo, fecha: f.saldo_no_cobrar_en } : null
        }))

    const concepto = await ConceptoRemuneracion.findOne({ where: { empresa_id: null, codigo: CODIGO_DESCUENTO } })
    const variables = concepto === null ? [] : await VariablePeriodo.findAll({
        where: { concepto_id: concepto.id, trabajador_id: { [Op.in]: ids }, ...(excluirVariableId ? { id: { [Op.ne]: excluirVariableId } } : {}) },
        attributes: ["monto"]
    })
    const descontado = variables.reduce((suma, v) => suma + Number(v.monto ?? 0), 0)

    return { finiquitos, descontado, pendiente: saldoPendiente(finiquitos, descontado) }
}

// Marca el saldo no recuperado de un finiquito como «no se cobrará» (por ejemplo, el trabajador no firmó la autorización).
async function noCobrarSaldo(finiquitoId, motivo, empresasPermitidas, usuarioId) {
    const finiquito = await Finiquito.findByPk(finiquitoId, { include: [Trabajador] })
    if (finiquito === null || !empresasPermitidas.includes(finiquito.Trabajador.empresa_id)) {
        throw new NotFoundError("Finiquito no encontrado")
    }
    await exigirRol(usuarioId, finiquito.Trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)
    if (!(Number(finiquito.detalle_calculo?.saldoPagoExceso?.noRecuperado ?? 0) > 0)) {
        throw new ConflictError("Ese finiquito no dejó saldo de pago en exceso sin recuperar")
    }
    if (finiquito.saldo_no_cobrar_en) {
        throw new ConflictError("Ese saldo ya está marcado como «no se cobrará»")
    }
    if (typeof motivo !== "string" || motivo.trim() === "") {
        throw new ValidationError("Debe indicar el motivo")
    }
    return await finiquito.update({ saldo_no_cobrar_motivo: motivo.trim(), saldo_no_cobrar_en: new Date(), saldo_no_cobrar_usuario_id: usuarioId })
}

// Para la ficha de la persona.
async function saldosParaFicha(personaId, empresasPermitidas) {
    const { obtenerPersonaPorId } = require("../trabajadores/persona.service.js")
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    return await saldosDePersona(persona.id, persona.empresa_id)
}

module.exports = { CODIGO_DESCUENTO, saldosDePersona, saldosParaFicha, noCobrarSaldo }
