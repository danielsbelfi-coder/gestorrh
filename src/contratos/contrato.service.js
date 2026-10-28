const {
    ContratoTrabajo, ContratoAnexo, Trabajador, Cargo, Empresa, Persona, Afp, Isapre, SituacionPrevisional, Jornada,
    Asistencia, LicenciaMedica, ResumenAsistencia, VariablePeriodo, Liquidacion, Finiquito
} = require("../shared/associations.js")
const { sequelize } = require("../shared/database.js")
const { armarContrato } = require("./armar_contrato.js")
const { situacionDelMes } = require("../remuneraciones/tipo_cotizante.js")
const { mesesQueSuma, conLimiteTrabajadores } = require("../cuentas/consumo.service.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { COMUNAS } = require("../shared/comunas_lre.js")
const { esFechaValida } = require("../shared/fechas.js")


async function validarDatosContrato(datos, empresaId, jornadaYaAsignada = null) {
    const cargo = await Cargo.findByPk(datos.cargo_id)

    if (cargo === null || cargo.empresa_id !== empresaId) {
        throw new NotFoundError("Cargo no encontrado")
    }

    if (datos.comuna_prestacion !== undefined && datos.comuna_prestacion !== null && COMUNAS[datos.comuna_prestacion] === undefined) {
        throw new ValidationError("La comuna de prestación no está en la tabla de la Dirección del Trabajo")
    }

    if (datos.jornada_id !== undefined && datos.jornada_id !== null) {
        const jornada = await Jornada.findByPk(datos.jornada_id)

        // Una plantilla desactivada se puede mantener en el contrato que ya la tenía, pero no asignarse de nuevo.
        if (jornada === null || jornada.empresa_id !== empresaId || (!jornada.activo && jornada.id !== jornadaYaAsignada)) {
            throw new NotFoundError("Jornada no encontrada")
        }

        if (datos.tipo_jornada === "excluido_limitacion") {
            throw new ConflictError("Un contrato excluido de la limitación de jornada no lleva plantilla de horario")
        }

        datos.horas_semanales = jornada.horas_semanales
        datos.dias_trabajados = jornada.dias_trabajados
    }
}

async function crearContrato(datos, empresasPermitidas, usuarioId) {
    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    const contratoVigente = await ContratoTrabajo.findOne({
        where: {
            trabajador_id: datos.trabajador_id,
            estado: "vigente"
        }
    })

    if (contratoVigente !== null) {
        throw new ConflictError("El trabajador ya tiene un contrato vigente")
    }

    await validarDatosContrato(datos, trabajador.empresa_id)

    const campos = [
        "trabajador_id",
        "tipo_contrato",
        "fecha_inicio",
        "fecha_termino",
        "causal_plazo_fijo",
        "obra_faena_descripcion",
        "cargo_id",
        "funciones",
        "lugar_prestacion_servicios",
        "tipo_jornada",
        "horas_semanales",
        "dias_trabajados",
        "jornada_id",
        "sistema_remuneracion",
        "sueldo_base",
        "periodicidad_pago",
        "comuna_prestacion"
    ]

    if (trabajador.estado !== "postulante") {
        return await ContratoTrabajo.create(datos, { fields: campos })
    }

    const antes = {
        estado: trabajador.estado,
        fecha_ingreso: trabajador.fecha_ingreso,
        fecha_termino: trabajador.fecha_termino
    }
    const meses = mesesQueSuma(antes, { ...antes, estado: "activo" })
    const empresa = await Empresa.findByPk(trabajador.empresa_id)

    return await conLimiteTrabajadores(empresa.cuenta_id, meses, async (transaction) => {
        const contrato = await ContratoTrabajo.create(datos, { fields: campos, transaction })
        await trabajador.update({ estado: "activo" }, { transaction })
        return contrato
    })
}


async function listarContratos(empresasPermitidas) {
    return await ContratoTrabajo.findAll({
        include: [{
            model: Trabajador,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            },
            required: true
        }]
    })
}

async function obtenerContratoPorId(id, empresasPermitidas) {
    const contrato = await ContratoTrabajo.findByPk(id, {
        include: [Trabajador]
    })

    if (contrato === null || !empresasPermitidas.includes(contrato.Trabajador.empresa_id)) {
        throw new NotFoundError("Contrato no encontrado")
    }

    return contrato

}

async function firmarContrato(id, fechaFirma, empresasPermitidas, usuarioId) {
    const contrato = await obtenerContratoPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, contrato.Trabajador.empresa_id, PERMISOS.FIRMAR_CONTRATO)

    if (contrato.estado_firma !== "pendiente") {
        throw new ConflictError("El contrato ya fue firmado o rechazado")
    }

    const fecha = fechaFirma ?? new Date()
    if (fechaFirma !== undefined && (!esFechaValida(fechaFirma) || fechaFirma < contrato.fecha_inicio)) {
        throw new ValidationError("La fecha de firma debe ser válida (AAAA-MM-DD) y no anterior al inicio del contrato")
    }

    return await contrato.update({ estado_firma: "firmado", fecha_firma: fecha })
}

async function documentoContrato(id, empresasPermitidas) {
    const contrato = await ContratoTrabajo.findByPk(id, {
        include: [
            Cargo,
            Jornada,
            { model: Trabajador, include: [{ model: Persona, include: [Afp, Isapre, SituacionPrevisional] }] }
        ]
    })

    if (contrato === null || !empresasPermitidas.includes(contrato.Trabajador.empresa_id)) {
        throw new NotFoundError("Contrato no encontrado")
    }

    const empresa = await Empresa.findByPk(contrato.Trabajador.empresa_id)
    const persona = contrato.Trabajador.Persona
    const situaciones = persona.SituacionesPrevisionales.map((s) => s.toJSON())

    return armarContrato({
        contrato: contrato.toJSON(),
        persona: persona.toJSON(),
        empresa: empresa.toJSON(),
        cargo: contrato.Cargo?.nombre ?? "",
        jornada: contrato.Jornada ? contrato.Jornada.toJSON() : null,
        trabajador: contrato.Trabajador,
        afp: persona.Afp,
        isapre: persona.Isapre,
        // Calidad de cotizante (activo o pensionado) vigente al inicio del contrato.
        situacion: situacionDelMes(situaciones, contrato.fecha_inicio)
    })
}

// Un contrato solo se corrige o anula mientras la firma está pendiente: todavía no produce efecto
// entre las partes. Firmado, los cambios van por anexo y el término por finiquito.
async function exigirContratoSinFirmar(contrato) {
    if (contrato.estado !== "vigente" || contrato.estado_firma !== "pendiente") {
        throw new ConflictError("Solo se puede corregir o anular un contrato vigente con la firma pendiente. Un contrato firmado se modifica con un anexo.")
    }

    const anexos = await ContratoAnexo.count({ where: { contrato_id: contrato.id } })
    if (anexos > 0) {
        throw new ConflictError("El contrato tiene anexos registrados; no se puede corregir ni anular")
    }
}

async function corregirContrato(id, datos, empresasPermitidas, usuarioId) {
    const contrato = await obtenerContratoPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, contrato.Trabajador.empresa_id, PERMISOS.GESTIONAR_FICHAS)
    await exigirContratoSinFirmar(contrato)

    // Se valida con los datos finales: lo que llega encima de lo que ya tenía el contrato.
    const finales = { ...contrato.toJSON(), ...datos }
    if (datos.tipo_jornada === "excluido_limitacion" && datos.jornada_id === undefined) {
        finales.jornada_id = null
    }
    await validarDatosContrato(finales, contrato.Trabajador.empresa_id, contrato.jornada_id)

    if (finales.fecha_termino && finales.fecha_termino < finales.fecha_inicio) {
        throw new ValidationError("La fecha de término no puede ser anterior a la de inicio")
    }

    const campos = [
        "tipo_contrato",
        "fecha_inicio",
        "fecha_termino",
        "causal_plazo_fijo",
        "obra_faena_descripcion",
        "cargo_id",
        "funciones",
        "lugar_prestacion_servicios",
        "tipo_jornada",
        "horas_semanales",
        "dias_trabajados",
        "jornada_id",
        "sistema_remuneracion",
        "sueldo_base",
        "periodicidad_pago",
        "comuna_prestacion"
    ]

    const cambios = {}
    for (const campo of campos) {
        if (finales[campo] !== undefined) {
            cambios[campo] = finales[campo]
        }
    }

    return await contrato.update(cambios, { fields: campos })
}

async function anularContrato(id, motivo, empresasPermitidas, usuarioId) {
    const contrato = await obtenerContratoPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, contrato.Trabajador.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    if (typeof motivo !== "string" || motivo.trim().length < 5) {
        throw new ValidationError("Indica el motivo de la anulación (mínimo 5 caracteres)")
    }

    await exigirContratoSinFirmar(contrato)

    // Si ya hay movimientos del trabajador, el contrato produjo efectos: se termina con finiquito.
    const trabajadorId = contrato.trabajador_id
    const movimientos = [
        [Asistencia, "asistencia"],
        [LicenciaMedica, "licencias médicas"],
        [ResumenAsistencia, "resúmenes de asistencia"],
        [VariablePeriodo, "variables del mes"],
        [Liquidacion, "liquidaciones"],
        [Finiquito, "finiquitos"]
    ]
    for (const [modelo, nombre] of movimientos) {
        if (await modelo.count({ where: { trabajador_id: trabajadorId } }) > 0) {
            throw new ConflictError(`El trabajador ya tiene ${nombre} registrados; el contrato no se puede anular, corresponde terminarlo con finiquito`)
        }
    }

    return await sequelize.transaction(async (transaction) => {
        await contrato.update({
            estado: "anulado",
            estado_firma: "rechazado",
            motivo_anulacion: motivo.trim(),
            fecha_anulacion: new Date()
        }, { transaction })

        // Si no le queda otro contrato válido, el trabajador vuelve a postulante y deja de contar en el plan.
        const otros = await ContratoTrabajo.count({
            where: { trabajador_id: trabajadorId, id: { [Op.ne]: contrato.id }, estado: { [Op.ne]: "anulado" } },
            transaction
        })
        if (otros === 0) {
            await Trabajador.update({ estado: "postulante" }, { where: { id: trabajadorId }, transaction })
        }

        return contrato
    })
}

module.exports = {
    crearContrato,
    listarContratos,
    obtenerContratoPorId,
    firmarContrato,
    documentoContrato,
    corregirContrato,
    anularContrato
}