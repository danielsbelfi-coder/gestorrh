const { Liquidacion, LiquidacionLinea, ConceptoRemuneracion, Trabajador, Persona, Afp, Isapre,
    Empresa, Mutualidad, ContratoTrabajo, ContratoAnexo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerPeriodoPorId, rangoDelPeriodo } = require("./periodo_remuneracion.service.js")
const { obtenerLimitesTramo } = require("./previred.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { ConflictError, NotFoundError } = require("../shared/errors.js")
const { contratoDelMes } = require("./contrato_del_mes.js")
const { tramoAsignacionFamiliar } = require("./archivo_previred.js")
const { columnasLre, encabezadoLre, lineaLre, camposIdentificacionLre, camposMontosLre } = require("./archivo_lre.js")

async function contratoDelTrabajador(trabajadorId, periodo, primerDia) {
    const vigente = await ContratoTrabajo.findOne({ where: { trabajador_id: trabajadorId, estado: "vigente" } })

    if (vigente === null) {
        return { problema: "No tiene un contrato vigente" }
    }

    const terminadoEnElMes = await ContratoTrabajo.count({
        where: {
            trabajador_id: trabajadorId,
            id: { [Op.ne]: vigente.id },
            estado: { [Op.ne]: "anulado" },
            fecha_termino: { [Op.gte]: primerDia }
        }
    })

    if (terminadoEnElMes > 0) {
        return { problema: "Tiene otro contrato que terminó en el mes; dos contratos en un mismo mes todavía no se informan" }
    }

    const anexos = await ContratoAnexo.findAll({ where: { contrato_id: vigente.id } })
    const { contrato } = contratoDelMes({
        contrato: vigente.toJSON(),
        anexos: anexos.map((anexo) => anexo.toJSON()),
        anio: periodo.anio,
        mes: periodo.mes
    })

    return { contrato }
}

async function generarLre(periodo_id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.GENERAR_LRE)

    const empresa = await Empresa.findByPk(periodo.empresa_id, { include: [Mutualidad] })

    if (empresa.Mutualidad?.codigo_lre === null || empresa.Mutualidad?.codigo_lre === undefined) {
        throw new ConflictError("La empresa no tiene una mutualidad con código LRE asignada")
    }

    const liquidaciones = await Liquidacion.findAll({
        where: { periodo_id: periodo.id, vigente: true },
        include: [
            { model: LiquidacionLinea, include: [ConceptoRemuneracion] },
            { model: Trabajador, include: [{ model: Persona, include: [Afp, Isapre] }] }
        ],
        order: [["trabajador_id", "ASC"]]
    })

    if (liquidaciones.length === 0) {
        throw new NotFoundError("No hay liquidaciones en este periodo")
    }

    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)
    const limitesTramo = await obtenerLimitesTramo(primerDia)
    const columnas = columnasLre()
    const problemas = []
    const lineas = []

    for (const registro of liquidaciones) {
        const liquidacion = registro.toJSON()
        const trabajador = liquidacion.Trabajador
        const persona = trabajador.Persona
        const detalle = liquidacion.detalle_calculo
        const motivos = []

        if (liquidacion.estado === "calculada") {
            motivos.push("La liquidación está en borrador; emítala antes de generar el archivo")
        }
        if (detalle?.cotizante === undefined) {
            motivos.push("La liquidación se calculó con un formato anterior; recalcúlela")
            problemas.push({ trabajador_id: trabajador.id, motivos })
            continue
        }

        const { contrato, problema } = await contratoDelTrabajador(trabajador.id, periodo, primerDia)
        if (problema) {
            motivos.push(problema)
        }

        const terminoEnElMes = trabajador.fecha_termino !== null && trabajador.fecha_termino <= ultimoDia

        if (contrato && !contrato.comuna_prestacion) {
            motivos.push("El contrato no tiene comuna de prestación de servicios")
        }
        if (terminoEnElMes && trabajador.causal_termino === null) {
            motivos.push("Tiene fecha de término pero no causal de término")
        }
        if (persona.Afp?.codigo_lre === null || persona.Afp?.codigo_lre === undefined) {
            motivos.push("La AFP de la persona no tiene código LRE")
        }
        if (detalle.salud.sistema === "Isapre" && (persona.Isapre?.codigo_lre === null || persona.Isapre?.codigo_lre === undefined)) {
            motivos.push("La isapre de la persona no tiene código LRE")
        }

        const lineasLiquidacion = liquidacion.LiquidacionLineas.map((linea) => ({
            codigo: linea.codigo,
            codigo_lre: linea.ConceptoRemuneracion.codigo_lre,
            tipo: linea.tipo,
            monto: Number(linea.monto)
        }))
        const montos = camposMontosLre(lineasLiquidacion)

        if (montos.sinCodigo.length > 0) {
            motivos.push(`Conceptos sin código LRE: ${montos.sinCodigo.join(", ")}`)
        }
        if (montos.valores[5501] !== Number(liquidacion.liquido_a_pagar)) {
            motivos.push(`El líquido del LRE (${montos.valores[5501]}) no coincide con el de la liquidación (${liquidacion.liquido_a_pagar})`)
        }

        if (motivos.length > 0) {
            problemas.push({ trabajador_id: trabajador.id, motivos })
            continue
        }

        const montoDe = (codigo) => lineasLiquidacion.filter((l) => l.codigo === codigo).reduce((suma, l) => suma + l.monto, 0)

        const identificacion = camposIdentificacionLre({
            rut: persona.rut,
            dv: persona.dv,
            fechaInicioContrato: contrato.fecha_inicio,
            fechaTermino: trabajador.fecha_termino,
            causalTermino: trabajador.causal_termino,
            ultimoDia,
            comuna: contrato.comuna_prestacion,
            tipoJornada: contrato.tipo_jornada,
            tipoPension: detalle.cotizante.tipoPension,
            afpLre: persona.Afp.codigo_lre,
            sistemaSalud: detalle.salud.sistema,
            isapreLre: persona.Isapre?.codigo_lre ?? null,
            cotizaCesantia: montoDe("CESANTIA") + montoDe("APORTE_CESANTIA") > 0,
            mutualLre: empresa.Mutualidad.codigo_lre,
            tramo: tramoAsignacionFamiliar(detalle.cotizaciones.rentaImponible, limitesTramo),
            diasTrabajados: liquidacion.dias_trabajados,
            diasLicencia: detalle.diasPago.licenciaMedica,
            diasVacaciones: detalle.diasPago.vacaciones
        })

        lineas.push(lineaLre(columnas, { ...identificacion, ...montos.valores }))
    }

    if (problemas.length > 0) {
        return { problemas }
    }

    const advertencias = periodo.estado === "abierto"
        ? ["El periodo está abierto: si se recalcula o emite algo más, habrá que generar el archivo de nuevo"]
        : []

    return {
        periodo,
        empresa,
        contenido: [encabezadoLre(columnas), ...lineas].join("\r\n") + "\r\n",
        advertencias
    }
}

module.exports = {
    generarLre
}