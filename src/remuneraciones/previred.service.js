const { Asistencia, Liquidacion, LiquidacionLinea, Trabajador, Persona, Afp, Isapre,
    Empresa, Mutualidad, ContratoTrabajo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { obtenerPeriodoPorId, rangoDelPeriodo } = require("./periodo_remuneracion.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { ConflictError, NotFoundError } = require("../shared/errors.js")
const { datosPrevired, problemasPrevired } = require("./datos_previred.js")
const { lineasTrabajador } = require("./archivo_previred.js")

const CODIGOS_TRAMOS = {
    a: "ASIG_FAMILIAR_TRAMO_A_HASTA",
    b: "ASIG_FAMILIAR_TRAMO_B_HASTA",
    c: "ASIG_FAMILIAR_TRAMO_C_HASTA"
}

async function obtenerLimitesTramo(fecha) {
    const limites = {}

    for (const [tramo, codigo] of Object.entries(CODIGOS_TRAMOS)) {
        const parametro = await obtenerParametroVigente(codigo, fecha)

        if (parametro === null) {
            throw new ConflictError(`No existe un parámetro ${codigo} vigente para la fecha del periodo`)
        }

        limites[tramo] = Number(parametro.valor)
    }

    return limites
}

async function fechasDeMarcas(trabajadorId, tipo, primerDia, ultimoDia) {
    const marcas = await Asistencia.findAll({
        where: {
            trabajador_id: trabajadorId,
            tipo,
            estado_aprobacion: "aprobada",
            fecha: { [Op.between]: [primerDia, ultimoDia] }
        },
        attributes: ["fecha"]
    })

    return marcas.map((marca) => marca.fecha)
}

async function generarPrevired(periodo_id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.GENERAR_PREVIRED)

    const empresa = await Empresa.findByPk(periodo.empresa_id, { include: [Mutualidad] })

    if (!empresa.Mutualidad?.codigo_previred) {
        throw new ConflictError("La empresa no tiene una mutualidad con código Previred asignada")
    }

    const liquidaciones = await Liquidacion.findAll({
        where: { periodo_id: periodo.id, vigente: true },
        include: [
            { model: LiquidacionLinea },
            { model: Trabajador, include: [{ model: Persona, include: [Afp, Isapre] }] }
        ],
        order: [["trabajador_id", "ASC"]]
    })

    if (liquidaciones.length === 0) {
        throw new NotFoundError("No hay liquidaciones en este periodo")
    }

    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)
    const limitesTramo = await obtenerLimitesTramo(primerDia)
    const problemas = []
    const lineas = []

    for (const registro of liquidaciones) {
        const liquidacion = registro.toJSON()
        const trabajadorId = liquidacion.trabajador_id
        const fechasInasistencia = await fechasDeMarcas(trabajadorId, "inasistencia", primerDia, ultimoDia)
        const fechasPermisoSinGoce = await fechasDeMarcas(trabajadorId, "permiso_sin_goce", primerDia, ultimoDia)

        const motivos = problemasPrevired({ liquidacion, primerDia, fechasInasistencia, fechasPermisoSinGoce })

        if (motivos.length > 0) {
            problemas.push({ trabajador_id: trabajadorId, motivos })
            continue
        }

        const contrato = await ContratoTrabajo.findOne({
            where: { trabajador_id: trabajadorId },
            order: [["fecha_inicio", "DESC"]]
        })

        lineas.push(...lineasTrabajador(datosPrevired({
            liquidacion,
            anio: periodo.anio,
            mes: periodo.mes,
            limitesTramo,
            codigoMutual: empresa.Mutualidad.codigo_previred,
            tipoJornada: contrato.tipo_jornada,
            fechasInasistencia,
            fechasPermisoSinGoce
        })))
    }

    if (problemas.length > 0) {
        return { problemas }
    }

    const advertencias = periodo.estado === "abierto"
        ? ["El periodo está abierto: si se recalcula o emite algo más, habrá que generar el archivo de nuevo"]
        : []

    return { periodo, contenido: lineas.join("\r\n") + "\r\n", advertencias }
}

module.exports = {
    generarPrevired,
    CODIGOS_TRAMOS
}