const { Trabajador, Persona, Empresa } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { mesesQueSuma, conLimiteTrabajadores } = require("../cuentas/consumo.service.js")
const { esFechaValida } = require("../shared/fechas.js")
const { CAUSALES_TERMINO } = require("../shared/causales_termino.js")
const { exigirSinCruce } = require("./relaciones.js")


async function crearTrabajador(datos, empresasPermitidas, usuarioId) {
    const empresaId = Number(datos.empresa_id)

    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }

    await exigirRol(usuarioId, empresaId, PERMISOS.GESTIONAR_FICHAS)

    const persona = await Persona.findByPk(datos.persona_id)

    if (persona === null || persona.empresa_id !== empresaId) {
        throw new NotFoundError("Persona no encontrada")
    }

    if (!esFechaValida(datos.fecha_ingreso)) {
        throw new ValidationError("Fecha de ingreso inválida")
    }
    // Una relación nueva no se cruza con otra de la misma persona (por ejemplo, una recontratación empieza después del término).
    await exigirSinCruce(Trabajador, { personaId: persona.id, empresaId, desde: datos.fecha_ingreso })

    return await Trabajador.create(datos, {
        fields: ["persona_id", "empresa_id", "fecha_ingreso"]
    })
}

async function listarTrabajadores(empresasPermitidas) {
    return await Trabajador.findAll({
        where: {
            empresa_id: { [Op.in]: empresasPermitidas }
        }
    })
}

async function obtenerTrabajadorPorId(id, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    return trabajador

}

async function actualizarTrabajador(id, datos, empresasPermitidas, usuarioId) {
    const trabajador = await obtenerTrabajadorPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    if (datos.fecha_ingreso !== undefined && !esFechaValida(datos.fecha_ingreso)) {
        throw new ValidationError("Fecha de ingreso inválida")
    }

    if (datos.fecha_termino !== undefined && datos.fecha_termino !== null && !esFechaValida(datos.fecha_termino)) {
        throw new ValidationError("Fecha de término inválida")
    }

    if (datos.causal_termino !== undefined && datos.causal_termino !== null && !CAUSALES_TERMINO.includes(Number(datos.causal_termino))) {
        throw new ValidationError("La causal de término no está en la tabla de la Dirección del Trabajo")
    }

    const campos = ["fecha_ingreso", "fecha_termino", "estado", "causal_termino"]

    const antes = {
        estado: trabajador.estado,
        fecha_ingreso: trabajador.fecha_ingreso,
        fecha_termino: trabajador.fecha_termino
    }

    const despues = {
        estado: datos.estado !== undefined ? datos.estado : antes.estado,
        fecha_ingreso: datos.fecha_ingreso !== undefined ? datos.fecha_ingreso : antes.fecha_ingreso,
        fecha_termino: datos.fecha_termino !== undefined ? datos.fecha_termino : antes.fecha_termino
    }

    if (despues.fecha_termino !== null && despues.fecha_termino < despues.fecha_ingreso) {
        throw new ValidationError("La fecha de término no puede ser anterior a la fecha de ingreso")
    }

    if (despues.fecha_ingreso !== antes.fecha_ingreso || despues.fecha_termino !== antes.fecha_termino) {
        await exigirSinCruce(Trabajador, { personaId: trabajador.persona_id, empresaId: trabajador.empresa_id, desde: despues.fecha_ingreso, hasta: despues.fecha_termino, excluirId: trabajador.id })
    }
    if (despues.fecha_ingreso !== antes.fecha_ingreso) {
        await exigirIngresoCorregible(trabajador)
    }

    const meses = mesesQueSuma(antes, despues)

    if (meses.length === 0) {
        return await trabajador.update(datos, { fields: campos })
    }

    const empresa = await Empresa.findByPk(trabajador.empresa_id)

    return await conLimiteTrabajadores(empresa.cuenta_id, meses, (transaction) =>
        trabajador.update(datos, { fields: campos, transaction }))
}

// La fecha de ingreso solo se corrige si no hay liquidaciones de meses cerrados (esos días ya se pagaron y declararon).
async function exigirIngresoCorregible(trabajador) {
    const { Liquidacion, PeriodoRemuneracion } = require("../shared/associations.js")
    const cerradas = await Liquidacion.count({
        where: { trabajador_id: trabajador.id },
        include: [{ model: PeriodoRemuneracion, where: { estado: "cerrado" }, required: true }]
    })
    if (cerradas > 0) {
        throw new ConflictError("La fecha de ingreso no se puede cambiar: el trabajador tiene liquidaciones de meses cerrados")
    }
}

async function desactivarTrabajador(id, empresasPermitidas, usuarioId) {
    const trabajadorDesvinculado = await actualizarTrabajador(id, { estado: "desvinculado" }, empresasPermitidas, usuarioId)

    return trabajadorDesvinculado
}

module.exports = {
    crearTrabajador,
    listarTrabajadores,
    obtenerTrabajadorPorId,
    actualizarTrabajador,
    desactivarTrabajador
}