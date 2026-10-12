const { PeriodoRemuneracion, Empresa } = require("../shared/associations");
const { Op } = require("sequelize")
const { NotFoundError, ConflictError } = require("../shared/errors.js");
const { PERMISOS, exigirRol } = require("../shared/permisos.js");

async function abrirPeriodo(datos, empresasPermitidas, usuarioId) {
    if (!empresasPermitidas.includes(Number(datos.empresa_id))) {
        throw new NotFoundError("Empresa no encontrada")
    }

    await exigirRol(usuarioId, Number(datos.empresa_id), PERMISOS.GESTIONAR_PERIODO,)

    const periodoExistente = await PeriodoRemuneracion.findOne({
        where: {
            empresa_id: datos.empresa_id,
            mes: datos.mes,
            anio: datos.anio
        }
    })
    if (periodoExistente !== null) {
        throw new ConflictError("Ya existe un periodo de remuneraciones creado para este mes y año")
    }

    return await PeriodoRemuneracion.create(datos, {
        fields: ["empresa_id", "mes", "anio", "fecha_apertura"]
    })
}

async function cerrarPeriodo(id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(id, empresasPermitidas)
    if (periodo.estado === "cerrado") {
        throw new ConflictError("El periodo de remuneraciones ya está cerrado")
    }

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.GESTIONAR_PERIODO)

    const fechaHoy = new Date().toISOString().split("T")[0]
    await periodo.update({
        estado: "cerrado",
        fecha_cierre: fechaHoy
    })
    return periodo
}

async function listarPeriodos(empresasPermitidas) {
    return await PeriodoRemuneracion.findAll({
        where: {
            empresa_id: { [Op.in]: empresasPermitidas }
        }
    })
}

async function obtenerPeriodoPorId(id, empresasPermitidas) {
    const periodo = await PeriodoRemuneracion.findByPk(id)

    if (periodo === null || !empresasPermitidas.includes(periodo.empresa_id)) {
        throw new NotFoundError("Periodo de remuneraciones no encontrado")
    }

    return periodo

}

module.exports = {
    abrirPeriodo,
    cerrarPeriodo,
    listarPeriodos,
    obtenerPeriodoPorId
}

