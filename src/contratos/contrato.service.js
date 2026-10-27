const { ContratoTrabajo, Trabajador, Cargo, Empresa } = require("../shared/associations.js")
const { mesesQueSuma, conLimiteTrabajadores } = require("../cuentas/consumo.service.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { COMUNAS } = require("../shared/comunas_lre.js")
const { esFechaValida } = require("../shared/fechas.js")


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

    const cargo = await Cargo.findByPk(datos.cargo_id)

    if (cargo === null || cargo.empresa_id !== trabajador.empresa_id) {
        throw new NotFoundError("Cargo no encontrado")
    }

    if (datos.comuna_prestacion !== undefined && datos.comuna_prestacion !== null && COMUNAS[datos.comuna_prestacion] === undefined) {
        throw new ValidationError("La comuna de prestación no está en la tabla de la Dirección del Trabajo")
    }

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

    await exigirRol(usuarioId, contrato.Trabajador.empresa_id, PERMISOS.GESTIONAR_FICHAS)

    if (contrato.estado_firma !== "pendiente") {
        throw new ConflictError("El contrato ya fue firmado o rechazado")
    }

    const fecha = fechaFirma ?? new Date()
    if (fechaFirma !== undefined && (!esFechaValida(fechaFirma) || fechaFirma < contrato.fecha_inicio)) {
        throw new ValidationError("La fecha de firma debe ser válida (AAAA-MM-DD) y no anterior al inicio del contrato")
    }

    return await contrato.update({ estado_firma: "firmado", fecha_firma: fecha })
}

module.exports = {
    crearContrato,
    listarContratos,
    obtenerContratoPorId,
    firmarContrato
}