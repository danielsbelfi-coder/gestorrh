const { PeriodoRemuneracion, PeriodoReapertura, Empresa, Trabajador, Persona, Usuario, Liquidacion, ResumenAsistencia, VariablePeriodo, Finiquito, TramoImpuesto } = require("../shared/associations");
const { sequelize } = require("../shared/database.js")
const { validarMotivo, problemasDeReapertura } = require("./reapertura_periodo.js")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { Op } = require("sequelize")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js");
const { PERMISOS, exigirRol } = require("../shared/permisos.js");

async function parametrosFaltantes(anio, mes) {
    const { CODIGOS_PARAMETROS } = require("./liquidacion.service.js")
    const { CODIGOS_TRAMOS } = require("./previred.service.js")
    const { CODIGOS_MONTOS } = require("./montos_asignacion_familiar.js")

    const fecha = `${anio}-${String(mes).padStart(2, "0")}-01`
    const faltantes = []

    for (const codigo of [...Object.values(CODIGOS_PARAMETROS), ...Object.values(CODIGOS_TRAMOS), ...Object.values(CODIGOS_MONTOS)]) {
        if (await obtenerParametroVigente(codigo, fecha) === null) {
            faltantes.push(codigo)
        }
    }

    const tramos = await TramoImpuesto.count({
        where: {
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [{ vigencia_hasta: null }, { vigencia_hasta: { [Op.gte]: fecha } }]
        }
    })
    if (tramos === 0) {
        faltantes.push("TRAMOS_IMPUESTO_UNICO")
    }

    return faltantes
}

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

    const periodo = await PeriodoRemuneracion.create(datos, {
        fields: ["empresa_id", "mes", "anio", "fecha_apertura"]
    })

    const faltantes = await parametrosFaltantes(periodo.anio, periodo.mes)
    const advertencias = faltantes.length === 0 ? [] : [
        `Faltan los parámetros legales de ${periodo.mes}/${periodo.anio}: ${faltantes.join(", ")}. Cárgalos antes de calcular las liquidaciones.`
    ]

    return { periodo, advertencias }
}

async function faltantesDelPeriodo(id, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(id, empresasPermitidas)
    return await parametrosFaltantes(periodo.anio, periodo.mes)
}

async function cerrarPeriodo(id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(id, empresasPermitidas)
    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.GESTIONAR_PERIODO)

    if (periodo.estado === "cerrado") {
        throw new ConflictError("El periodo de remuneraciones ya está cerrado")
    }

    const problemas = await problemasDeCierre(periodo)

    if (problemas.length > 0) {
        return { cerrado: false, problemas }
    }

    const fechaHoy = new Date().toISOString().split("T")[0]
    await periodo.update({
        estado: "cerrado",
        fecha_cierre: fechaHoy
    })

    return { cerrado: true, periodo }
}

async function listarPeriodos(empresasPermitidas) {
    const periodos = await PeriodoRemuneracion.findAll({
        where: {
            empresa_id: { [Op.in]: empresasPermitidas }
        },
        include: [{
            model: PeriodoReapertura,
            as: "reaperturas",
            include: [{ model: Usuario, as: "usuario", attributes: ["id", "nombre"] }]
        }]
    })

    return periodos.map((periodo) => {
        const datos = periodo.toJSON()
        datos.reaperturas.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        return datos
    })
}

// Lo que hay que resolver antes de cerrar el periodo, con el nombre de cada trabajador (para mostrarlo antes de confirmar).
async function revisionDeCierre(id, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(id, empresasPermitidas)
    const problemas = periodo.estado === "abierto" ? await problemasDeCierre(periodo) : []

    const trabajadores = await Trabajador.findAll({
        where: { id: problemas.map((p) => p.trabajador_id) },
        include: [Persona]
    })
    const nombres = new Map(trabajadores.map((t) => [t.id,
        [t.Persona.nombres, t.Persona.apellido_paterno, t.Persona.apellido_materno].filter(Boolean).join(" ")]))

    return {
        estado: periodo.estado,
        problemas: problemas.map((p) => ({ ...p, nombre: nombres.get(p.trabajador_id) ?? `Trabajador ${p.trabajador_id}` }))
    }
}

// Reabre un periodo cerrado (solo ADMIN, con motivo obligatorio, dejando registro de quién, cuándo y por qué).
async function reabrirPeriodo(id, datos, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(id, empresasPermitidas)
    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.REABRIR_PERIODO)

    const { motivo, error } = validarMotivo(datos?.motivo)
    if (error) {
        throw new ValidationError(error)
    }

    return await sequelize.transaction(async (transaction) => {
        const actual = await PeriodoRemuneracion.findByPk(periodo.id, { transaction, lock: transaction.LOCK.UPDATE })

        const otros = await PeriodoRemuneracion.findAll({
            where: { empresa_id: actual.empresa_id, id: { [Op.ne]: actual.id } },
            transaction
        })
        const emitidas = await Liquidacion.findAll({
            attributes: ["periodo_id", [sequelize.fn("COUNT", sequelize.col("id")), "total"]],
            where: { periodo_id: otros.map((p) => p.id), estado: "emitida", vigente: true },
            group: ["periodo_id"],
            raw: true,
            transaction
        })
        const emitidasPorPeriodo = new Map(emitidas.map((e) => [e.periodo_id, Number(e.total)]))

        const problemas = problemasDeReapertura({
            periodo: actual,
            posteriores: otros.map((p) => ({ mes: p.mes, anio: p.anio, estado: p.estado, emitidas: emitidasPorPeriodo.get(p.id) ?? 0 }))
        })
        if (problemas.length > 0) {
            throw new ConflictError(`No se puede reabrir el periodo: ${problemas.join(". ")}`)
        }

        await PeriodoReapertura.create({
            periodo_id: actual.id,
            usuario_id: usuarioId,
            motivo,
            fecha_cierre_anterior: actual.fecha_cierre
        }, { transaction })

        await actual.update({ estado: "abierto", fecha_cierre: null }, { transaction })

        return actual
    })
}

async function obtenerPeriodoPorId(id, empresasPermitidas) {
    const periodo = await PeriodoRemuneracion.findByPk(id)

    if (periodo === null || !empresasPermitidas.includes(periodo.empresa_id)) {
        throw new NotFoundError("Periodo de remuneraciones no encontrado")
    }

    return periodo

}

function rangoDelPeriodo(periodo) {
    const mm = String(periodo.mes).padStart(2, "0")
    const ultimo = new Date(Date.UTC(periodo.anio, periodo.mes, 0)).getUTCDate()

    return { primerDia: `${periodo.anio}-${mm}-01`, ultimoDia: `${periodo.anio}-${mm}-${String(ultimo).padStart(2, "0")}` }
}

async function trabajadoresDelPeriodo(periodo) {
    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)

    return await Trabajador.findAll({
        where: {
            empresa_id: periodo.empresa_id,
            estado: { [Op.ne]: "postulante" },
            fecha_ingreso: { [Op.lte]: ultimoDia },
            [Op.or]: [{ fecha_termino: null }, { fecha_termino: { [Op.gte]: primerDia } }]
        },
        order: [["id", "ASC"]]
    })
}

async function problemasDeCierre(periodo) {
    const trabajadores = await trabajadoresDelPeriodo(periodo)
    const problemas = []

    for (const trabajador of trabajadores) {
        const filtro = { periodo_id: periodo.id, trabajador_id: trabajador.id }
        const motivos = []

        const resumen = await ResumenAsistencia.findOne({ where: filtro })
        if (resumen === null || resumen.estado !== "aprobado") {
            motivos.push("El resumen de asistencia no está aprobado")
        }

        const liquidacion = await Liquidacion.findOne({ where: { ...filtro, vigente: true } })
        if (liquidacion === null) {
            motivos.push("No tiene liquidación")
        } else if (liquidacion.estado !== "emitida") {
            motivos.push("La liquidación está en borrador (sin emitir)")
        }

        const pendientes = await VariablePeriodo.count({ where: { ...filtro, estado: "pendiente" } })
        if (pendientes > 0) {
            motivos.push(`Tiene ${pendientes} variable(s) pendiente(s) de aprobación`)
        }

        if (trabajador.fecha_termino !== null && trabajador.fecha_termino.slice(0, 7) === `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`) {
            const finiquito = await Finiquito.findOne({ where: { trabajador_id: trabajador.id } })
            if (finiquito === null || finiquito.estado === "calculado") {
                motivos.push("Terminó en el mes y no tiene su finiquito emitido")
            }
        }

        if (motivos.length > 0) {
            problemas.push({ trabajador_id: trabajador.id, motivos })
        }
    }

    return problemas
}

module.exports = {
    abrirPeriodo,
    cerrarPeriodo,
    reabrirPeriodo,
    revisionDeCierre,
    listarPeriodos,
    obtenerPeriodoPorId,
    rangoDelPeriodo,
    trabajadoresDelPeriodo,
    problemasDeCierre,
    parametrosFaltantes
}

