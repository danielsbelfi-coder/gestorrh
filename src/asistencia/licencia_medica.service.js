const { LicenciaMedica, Trabajador, PeriodoRemuneracion } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { esFechaValida, fechaChilena, diasEntre } = require("../shared/fechas.js")
const { buscarPagador } = require("./pagadores_subsidio.js")
const { rangoDelPeriodo } = require("../remuneraciones/periodo_remuneracion.service.js")

const TIPOS_LICENCIA = ["comun", "maternal", "accidente_trabajo"]

async function obtenerTrabajadorPermitido(trabajadorId, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(trabajadorId)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    return trabajador
}

async function advertenciasMesesCerrados(trabajador, inicio, termino) {
    const cerrados = await PeriodoRemuneracion.findAll({
        where: { empresa_id: trabajador.empresa_id, estado: "cerrado" },
        order: [["anio", "ASC"], ["mes", "ASC"]]
    })

    const advertencias = []

    for (const periodo of cerrados) {
        const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)
        const desde = inicio > primerDia ? inicio : primerDia
        const hasta = termino < ultimoDia ? termino : ultimoDia

        if (desde <= hasta) {
            advertencias.push(`La licencia toca el periodo ${periodo.mes}/${periodo.anio}, que ya está cerrado (${diasEntre(desde, hasta)} día(s)). Revise si corresponde descontar un pago en exceso en el mes siguiente y rectificar Previred.`)
        }
    }

    return advertencias
}

async function crearLicencia(datos, empresasPermitidas, usuarioId) {
    const trabajador = await obtenerTrabajadorPermitido(datos?.trabajador_id, empresasPermitidas)

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)

    if (!esFechaValida(datos.fecha_inicio) || !esFechaValida(datos.fecha_termino)) {
        throw new ValidationError("Las fechas de inicio y de término deben ser válidas (AAAA-MM-DD)")
    }
    if (datos.fecha_inicio > datos.fecha_termino) {
        throw new ValidationError("La fecha de término no puede ser anterior a la de inicio")
    }
    if (!TIPOS_LICENCIA.includes(datos.tipo)) {
        throw new ValidationError("El tipo de licencia debe ser comun, maternal o accidente_trabajo")
    }

    const pagador = buscarPagador(datos.pagador)
    if (pagador === null) {
        throw new ValidationError("La entidad pagadora no está en la tabla de Previred")
    }

    const cruce = await LicenciaMedica.findOne({
        where: {
            trabajador_id: trabajador.id,
            fecha_inicio: { [Op.lte]: datos.fecha_termino },
            fecha_termino: { [Op.gte]: datos.fecha_inicio }
        }
    })

    if (cruce !== null) {
        throw new ConflictError(`Se cruza con la licencia del ${fechaChilena(cruce.fecha_inicio)} al ${fechaChilena(cruce.fecha_termino)}`)
    }

    const advertencias = await advertenciasMesesCerrados(trabajador, datos.fecha_inicio, datos.fecha_termino)

    const licencia = await LicenciaMedica.create({
        trabajador_id: trabajador.id,
        fecha_inicio: datos.fecha_inicio,
        fecha_termino: datos.fecha_termino,
        folio: datos.folio || null,
        tipo: datos.tipo,
        pagador_rut: pagador.rut,
        pagador_dv: pagador.dv,
        usuario_registro_id: usuarioId
    })


    return { licencia, advertencias }
}

async function listarLicencias(trabajadorId, empresasPermitidas) {
    const trabajador = await obtenerTrabajadorPermitido(trabajadorId, empresasPermitidas)

    return await LicenciaMedica.findAll({
        where: { trabajador_id: trabajador.id },
        order: [["fecha_inicio", "DESC"]]
    })
}

async function eliminarLicencia(id, empresasPermitidas, usuarioId) {
    const licencia = await LicenciaMedica.findByPk(id)

    if (licencia === null) {
        throw new NotFoundError("Licencia no encontrada")
    }

    const trabajador = await obtenerTrabajadorPermitido(licencia.trabajador_id, empresasPermitidas)

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)

    await licencia.destroy()
}

module.exports = {
    crearLicencia,
    listarLicencias,
    eliminarLicencia
}