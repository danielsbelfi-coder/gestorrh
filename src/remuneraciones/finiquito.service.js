const { Finiquito, Trabajador, Persona, Liquidacion, LiquidacionLinea, ConceptoRemuneracion,
    PeriodoRemuneracion, ContratoTrabajo, ContratoAnexo,
    Empresa, Cargo } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { contratoDelMes } = require("./contrato_del_mes.js")
const { camposMontosLre } = require("./archivo_lre.js")
const { tiempoServido, diasFeriadoGanados, basesFiniquito, montosFiniquito } = require("./calculo_finiquito.js")
const { esFechaValida } = require("../shared/fechas.js")
const { armarFiniquito } = require("../remuneraciones/armar_finiquito.js")

const TOPE_UF_INDEMNIZACION = 90

async function montosMesesAnteriores(trabajador, anio, mes) {
    const liquidaciones = await Liquidacion.findAll({
        where: { trabajador_id: trabajador.id, vigente: true, estado: { [Op.ne]: "calculada" } },
        include: [
            { model: LiquidacionLinea, include: [ConceptoRemuneracion] },
            {
                model: PeriodoRemuneracion,
                required: true,
                where: {
                    empresa_id: trabajador.empresa_id,
                    [Op.or]: [{ anio: { [Op.lt]: anio } }, { anio, mes: { [Op.lt]: mes } }]
                }
            }
        ],
        order: [[PeriodoRemuneracion, "anio", "DESC"], [PeriodoRemuneracion, "mes", "DESC"]]
    })

    return liquidaciones.slice(0, 3).map((liquidacion) => ({
        periodo: `${liquidacion.PeriodoRemuneracion.anio}-${String(liquidacion.PeriodoRemuneracion.mes).padStart(2, "0")}`,
        montos: camposMontosLre(liquidacion.LiquidacionLineas.map((linea) => ({
            codigo: linea.codigo,
            codigo_lre: linea.ConceptoRemuneracion.codigo_lre,
            tipo: linea.tipo,
            monto: Number(linea.monto)
        }))).valores
    }))
}

async function sueldoDelMesDeTermino(trabajador, anio, mes) {
    const vigente = await ContratoTrabajo.findOne({ where: { trabajador_id: trabajador.id, estado: "vigente" } })

    if (vigente === null) {
        throw new ConflictError("El trabajador no tiene un contrato vigente")
    }

    const anexos = await ContratoAnexo.findAll({ where: { contrato_id: vigente.id } })
    const { contrato } = contratoDelMes({ contrato: vigente.toJSON(), anexos: anexos.map((a) => a.toJSON()), anio, mes })

    return Number(contrato.sueldo_base)
}

function validarDatosFiniquito(datos, fechaTermino) {
    if (typeof datos.fecha_finiquito !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_finiquito) || datos.fecha_finiquito < fechaTermino) {
        throw new ValidationError("La fecha del finiquito debe ser válida (AAAA-MM-DD) y no anterior a la fecha de término")
    }
    if (typeof datos.lugar !== "string" || datos.lugar.trim() === "") {
        throw new ValidationError("Debe indicar el lugar donde se firma el finiquito")
    }
    if (typeof datos.aviso_previo_dado !== "boolean") {
        throw new ValidationError("Debe indicar si se dio aviso previo (true o false)")
    }
    if (!(Number(datos.dias_tomados) >= 0) || !Number.isInteger(Number(datos.dias_inhabiles)) || Number(datos.dias_inhabiles) < 0) {
        throw new ValidationError("Los días tomados deben ser 0 o más, y los días inhábiles, un entero de 0 o más")
    }
    if (!Number.isInteger(Number(datos.imputacion_afc ?? 0)) || Number(datos.imputacion_afc ?? 0) < 0) {
        throw new ValidationError("La imputación del seguro de cesantía debe ser un monto entero de 0 o más")
    }

    const descuentos = datos.descuentos ?? []
    const descuentosValidos = Array.isArray(descuentos) && descuentos.every((d) =>
        typeof d.glosa === "string" && d.glosa.trim() !== "" && Number.isInteger(d.monto) && d.monto > 0)

    if (!descuentosValidos) {
        throw new ValidationError("Cada descuento debe tener una glosa y un monto entero mayor que 0")
    }

    return descuentos.map((d) => ({ glosa: d.glosa.trim(), monto: d.monto }))
}

async function calcularFiniquito(datos, empresasPermitidas, usuarioId) {
    const trabajador = await Trabajador.findByPk(datos?.trabajador_id, { include: [Persona] })

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)

    if (trabajador.fecha_termino === null || trabajador.causal_termino === null) {
        throw new ConflictError("Registre primero la fecha y la causal de término del trabajador")
    }

    const descuentos = validarDatosFiniquito(datos, trabajador.fecha_termino)

    const existente = await Finiquito.findOne({ where: { trabajador_id: trabajador.id } })
    if (existente !== null && existente.estado !== "calculado") {
        throw new ConflictError("El finiquito ya fue emitido y no se puede recalcular")
    }

    const anio = Number(trabajador.fecha_termino.slice(0, 4))
    const mes = Number(trabajador.fecha_termino.slice(5, 7))
    const sueldoMensual = await sueldoDelMesDeTermino(trabajador, anio, mes)
    const meses = await montosMesesAnteriores(trabajador, anio, mes)
    const bases = basesFiniquito({ sueldoMensual, meses: meses.map((m) => m.montos) })

    const uf = await obtenerParametroVigente("UF", `${datos.fecha_finiquito.slice(0, 7)}-01`)
    if (uf === null) {
        throw new ConflictError("No existe un valor de UF vigente para el mes del finiquito")
    }

    const tiempo = tiempoServido(trabajador.fecha_ingreso, trabajador.fecha_termino)
    const diasGanados = diasFeriadoGanados(tiempo)
    const diasPendientes = Math.round((diasGanados - Number(datos.dias_tomados)) * 100) / 100

    if (diasPendientes < 0) {
        throw new ValidationError(`Los días tomados (${datos.dias_tomados}) superan los días ganados (${diasGanados})`)
    }

    let montos
    try {
        montos = montosFiniquito({
            causal: trabajador.causal_termino,
            avisoPrevioDado: datos.aviso_previo_dado,
            tiempo,
            baseIndemnizacion: bases.baseIndemnizacion,
            baseFeriado: bases.baseFeriado,
            topeUF: TOPE_UF_INDEMNIZACION,
            valorUF: Number(uf.valor),
            diasPendientes,
            diasInhabiles: Number(datos.dias_inhabiles),
            imputacionAfc: Number(datos.imputacion_afc ?? 0),
            descuentos
        })
    } catch (error) {
        throw new ConflictError(error.message)
    }

    const campos = {
        fecha_finiquito: datos.fecha_finiquito,
        lugar: datos.lugar.trim(),
        aviso_previo_dado: datos.aviso_previo_dado,
        dias_tomados: Number(datos.dias_tomados),
        dias_inhabiles: Number(datos.dias_inhabiles),
        imputacion_afc: montos.imputacion,
        descuentos,
        monto_feriado: montos.montoFeriado,
        monto_aviso_previo: montos.montoAvisoPrevio,
        monto_anios_servicio: montos.montoAniosServicio,
        total_descuentos: montos.totalDescuentos,
        total_a_pagar: montos.totalAPagar,
        detalle_calculo: {
            fechaIngreso: trabajador.fecha_ingreso,
            fechaTermino: trabajador.fecha_termino,
            causal: trabajador.causal_termino,
            tiempo,
            anios: montos.anios,
            sueldoMensual,
            mesesPromedio: meses.map((m) => m.periodo),
            bases,
            valorUF: Number(uf.valor),
            topeUF: TOPE_UF_INDEMNIZACION,
            baseTopada: montos.baseTopada,
            feriado: { diasGanados, diasTomados: Number(datos.dias_tomados), diasPendientes, diasInhabiles: Number(datos.dias_inhabiles), diasPorPagar: montos.diasFeriado }
        }
    }

    if (existente !== null) {
        return await existente.update(campos)
    }

    return await Finiquito.create({ ...campos, trabajador_id: trabajador.id, usuario_registro_id: usuarioId })
}

async function obtenerFiniquitoPermitido(where, empresasPermitidas) {
    const finiquito = await Finiquito.findOne({ where, include: [Trabajador] })

    if (finiquito === null || !empresasPermitidas.includes(finiquito.Trabajador.empresa_id)) {
        throw new NotFoundError("Finiquito no encontrado")
    }

    return finiquito
}

async function obtenerFiniquito(trabajadorId, empresasPermitidas) {
    return await obtenerFiniquitoPermitido({ trabajador_id: trabajadorId }, empresasPermitidas)
}

async function emitirFiniquito(id, empresasPermitidas, usuarioId) {
    const finiquito = await obtenerFiniquitoPermitido({ id }, empresasPermitidas)

    await exigirRol(usuarioId, finiquito.Trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)

    if (finiquito.estado !== "calculado") {
        throw new ConflictError("El finiquito ya fue emitido")
    }

    const detalle = finiquito.detalle_calculo
    if (detalle.fechaTermino !== finiquito.Trabajador.fecha_termino || detalle.causal !== finiquito.Trabajador.causal_termino) {
        throw new ConflictError("La fecha o la causal de término cambiaron después del cálculo; recalcule el finiquito antes de emitirlo")
    }

    return await finiquito.update({ estado: "emitido", fecha_emision: new Date(), emitido_por_id: usuarioId })
}

async function pagarFiniquito(id, fechaPago, empresasPermitidas, usuarioId) {
    const finiquito = await obtenerFiniquitoPermitido({ id }, empresasPermitidas)

    await exigirRol(usuarioId, finiquito.Trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)

    if (!esFechaValida(fechaPago) || fechaPago < finiquito.Trabajador.fecha_termino) {
        throw new ValidationError("La fecha de pago debe ser válida (AAAA-MM-DD) y no anterior a la fecha de término")
    }
    if (finiquito.estado !== "emitido") {
        throw new ConflictError(finiquito.estado === "pagado" ? "El finiquito ya está pagado" : "El finiquito debe emitirse antes de marcarlo como pagado")
    }

    return await finiquito.update({ estado: "pagado", fecha_pago: fechaPago })
}

async function documentoFiniquito(id, empresasPermitidas) {
    const finiquito = await Finiquito.findOne({
        where: { id },
        include: [{ model: Trabajador, include: [Persona] }]
    })

    if (finiquito === null || !empresasPermitidas.includes(finiquito.Trabajador.empresa_id)) {
        throw new NotFoundError("Finiquito no encontrado")
    }

    const empresa = await Empresa.findByPk(finiquito.Trabajador.empresa_id)
    const contrato = await ContratoTrabajo.findOne({
        where: { trabajador_id: finiquito.trabajador_id, estado: "vigente" },
        include: [Cargo]
    })

    const documento = armarFiniquito({
        finiquito: finiquito.toJSON(),
        empresa,
        cargo: contrato?.Cargo?.nombre ?? "",
        lugarServicios: contrato?.lugar_prestacion_servicios ?? ""
    })

    if (!documento.totalCuadra) {
        throw new ConflictError("El documento no cuadra con el total guardado en el finiquito")
    }

    return documento
}

module.exports = {
    calcularFiniquito,
    obtenerFiniquito,
    emitirFiniquito,
    pagarFiniquito,
    documentoFiniquito
}