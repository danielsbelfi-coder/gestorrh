const { Finiquito, Trabajador, Persona, Liquidacion, LiquidacionLinea, ConceptoRemuneracion,
    PeriodoRemuneracion, ContratoTrabajo, ContratoAnexo,
    Empresa, Cargo, FiniquitoEliminado } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { contratoDelMes } = require("./contrato_del_mes.js")
const { camposMontosLre } = require("./archivo_lre.js")
const { tiempoServido, diasFeriadoGanados, basesFiniquito, montosFiniquito } = require("./calculo_finiquito.js")
const { esFechaValida } = require("../shared/fechas.js")
const { armarFiniquito } = require("./armar_finiquito.js")

const TOPE_UF_INDEMNIZACION = 90

const CODIGOS_DESCUENTO_FINIQUITO = [3171, 3183, 3185, 3186, 3188]
const GLOSA_SALDO_PAGO_EXCESO = "Saldo de pago en exceso"
const CODIGO_LRE_PAGO_EXCESO = 3188

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

    // El descuento del saldo de pago en exceso lo agrega el sistema: si la pantalla lo reenvía, se ignora.
    const descuentos = Array.isArray(datos.descuentos) ? datos.descuentos.filter((d) => d?.automatico !== true) : (datos.descuentos ?? [])
    const descuentosValidos = Array.isArray(descuentos) && descuentos.every((d) =>
        typeof d.glosa === "string" && d.glosa.trim() !== "" && Number.isInteger(d.monto) && d.monto > 0
        && CODIGOS_DESCUENTO_FINIQUITO.includes(d.codigo_lre))

    if (!descuentosValidos) {
        throw new ValidationError(`Cada descuento debe tener una glosa, un monto entero mayor que 0 y un código LRE (${CODIGOS_DESCUENTO_FINIQUITO.join(", ")})`)
    }

    return descuentos.map((d) => ({ glosa: d.glosa.trim(), monto: d.monto, codigo_lre: d.codigo_lre }))
}

// Liquidaciones del trabajador en meses posteriores al término (por ejemplo, calculadas antes de registrar el término).
// Mientras existan, el finiquito no se calcula ni se cierra: hay que eliminarlas primero.
async function exigirSinLiquidacionesPosteriores(trabajador) {
    const anio = Number(trabajador.fecha_termino.slice(0, 4))
    const mes = Number(trabajador.fecha_termino.slice(5, 7))
    const posterior = await Liquidacion.findOne({
        where: { trabajador_id: trabajador.id, vigente: true },
        include: [{
            model: PeriodoRemuneracion,
            required: true,
            where: { empresa_id: trabajador.empresa_id, [Op.or]: [{ anio: { [Op.gt]: anio } }, { anio, mes: { [Op.gt]: mes } }] }
        }],
        order: [[PeriodoRemuneracion, "anio", "ASC"], [PeriodoRemuneracion, "mes", "ASC"]]
    })
    if (posterior !== null) {
        const p = posterior.PeriodoRemuneracion
        throw new ConflictError(`El trabajador tiene una liquidación de ${String(p.mes).padStart(2, "0")}-${p.anio}, posterior al término: elimínela antes de calcular o cerrar el finiquito (Liquidaciones → Eliminar)`)
    }
}

async function exigirPeriodoAbierto(trabajador) {
    const anio = Number(trabajador.fecha_termino.slice(0, 4))
    const mes = Number(trabajador.fecha_termino.slice(5, 7))
    const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: trabajador.empresa_id, anio, mes } })

    if (periodo === null || periodo.estado !== "abierto") {
        throw new ConflictError(`El periodo ${mes}/${anio} del término no existe o está cerrado; el finiquito ya no se puede calcular ni emitir`)
    }

    return periodo
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

    const periodo = await exigirPeriodoAbierto(trabajador)
    await exigirSinLiquidacionesPosteriores(trabajador)

    // El finiquito descuenta el saldo de pago en exceso que deja la liquidación del mes de término: debe existir.
    const liquidacionDelMes = await Liquidacion.findOne({ where: { periodo_id: periodo.id, trabajador_id: trabajador.id, vigente: true } })
    if (liquidacionDelMes === null) {
        throw new ConflictError(`Calcule primero la liquidación de ${String(periodo.mes).padStart(2, "0")}-${periodo.anio} del trabajador: el finiquito descuenta el saldo de pago en exceso que deje`)
    }
    const saldoPendiente = Number(liquidacionDelMes.saldo_pago_exceso)

    const descuentos = validarDatosFiniquito(datos, trabajador.fecha_termino)

    const existente = await Finiquito.findOne({ where: { trabajador_id: trabajador.id } })
    if (existente !== null && existente.estado === "pagado") {
        throw new ConflictError("El finiquito ya está pagado; las diferencias se tratan como refiniquito")
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

    const calcularMontos = (lista) => montosFiniquito({
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
        descuentos: lista
    })

    let montos
    try {
        montos = calcularMontos(descuentos)
    } catch (error) {
        throw new ConflictError(error.message)
    }

    // Saldo de pago en exceso: se descuenta hasta dejar el finiquito en cero; lo que no alcanza queda informado.
    const saldoDescontado = Math.min(saldoPendiente, montos.totalAPagar)
    if (saldoDescontado > 0) {
        descuentos.push({ glosa: GLOSA_SALDO_PAGO_EXCESO, monto: saldoDescontado, codigo_lre: CODIGO_LRE_PAGO_EXCESO, automatico: true })
        montos = calcularMontos(descuentos)
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
            feriado: { diasGanados, diasTomados: Number(datos.dias_tomados), diasPendientes, diasInhabiles: Number(datos.dias_inhabiles), diasPorPagar: montos.diasFeriado },
            saldoPagoExceso: { saldo: saldoPendiente, descontado: saldoDescontado, noRecuperado: saldoPendiente - saldoDescontado }
        }
    }

    if (existente !== null) {
        return await existente.update({ ...campos, estado: "calculado", fecha_emision: null, emitido_por_id: null })
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

// ¿El saldo de pago en exceso que descontó el finiquito sigue siendo el de la liquidación del mes de término?
// Solo para finiquitos que todavía se pueden recalcular (calculado o emitido).
async function estadoSaldoFiniquito(finiquito, trabajador) {
    if (finiquito.estado === "pagado" || !trabajador.fecha_termino) {
        return { desactualizado: false }
    }
    const anio = Number(trabajador.fecha_termino.slice(0, 4))
    const mes = Number(trabajador.fecha_termino.slice(5, 7))
    const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: trabajador.empresa_id, anio, mes } })
    const liquidacion = periodo === null ? null : await Liquidacion.findOne({ where: { periodo_id: periodo.id, trabajador_id: trabajador.id, vigente: true } })
    const guardado = Number(finiquito.detalle_calculo?.saldoPagoExceso?.saldo ?? 0)
    const actual = liquidacion === null ? 0 : Number(liquidacion.saldo_pago_exceso)
    return { desactualizado: guardado !== actual, guardado, actual, periodoAbierto: periodo?.estado === "abierto" }
}

// El finiquito con la marca de saldo desactualizado (para la lista de Finiquitos).
async function obtenerFiniquito(trabajadorId, empresasPermitidas) {
    const finiquito = await obtenerFiniquitoPermitido({ trabajador_id: trabajadorId }, empresasPermitidas)
    const saldo = await estadoSaldoFiniquito(finiquito, finiquito.Trabajador)
    return { ...finiquito.toJSON(), saldo_desactualizado: saldo.desactualizado, saldo_liquidacion: saldo.actual ?? null }
}

// Datos del cálculo guardados en el finiquito, para recalcularlo sin volver a llenar el formulario.
function datosGuardados(finiquito) {
    return {
        trabajador_id: finiquito.trabajador_id,
        fecha_finiquito: finiquito.fecha_finiquito,
        lugar: finiquito.lugar,
        aviso_previo_dado: finiquito.aviso_previo_dado,
        dias_tomados: Number(finiquito.dias_tomados),
        dias_inhabiles: Number(finiquito.dias_inhabiles),
        imputacion_afc: Number(finiquito.imputacion_afc),
        descuentos: (finiquito.descuentos ?? []).filter((d) => !d.automatico)
    }
}

async function recalcularFiniquito(id, empresasPermitidas, usuarioId) {
    const finiquito = await obtenerFiniquitoPermitido({ id }, empresasPermitidas)
    return await calcularFiniquito(datosGuardados(finiquito), empresasPermitidas, usuarioId)
}

// Periodo del mes de término: debe estar abierto para eliminar el finiquito o quitar el término.
async function exigirPeriodoDelTerminoAbierto(trabajador) {
    const anio = Number(trabajador.fecha_termino.slice(0, 4))
    const mes = Number(trabajador.fecha_termino.slice(5, 7))
    const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: trabajador.empresa_id, anio, mes } })
    if (periodo !== null && periodo.estado !== "abierto") {
        throw new ConflictError(`El periodo ${String(mes).padStart(2, "0")}-${anio} del término está cerrado; si es necesario, el administrador puede reabrirlo`)
    }
    return periodo
}

// Quita la fecha y la causal de término (el trabajador vuelve a activo). Pasa por actualizarTrabajador para respetar
// el límite de trabajadores del plan (sin término, el trabajador vuelve a contar en los meses siguientes).
// Avisa si hay que recalcular la liquidación del mes.
async function quitarTerminoDe(trabajador, periodo, empresasPermitidas, usuarioId) {
    const { actualizarTrabajador } = require("../trabajadores/trabajador.service.js")
    await actualizarTrabajador(trabajador.id, {
        fecha_termino: null,
        causal_termino: null,
        estado: trabajador.estado === "desvinculado" ? "activo" : trabajador.estado
    }, empresasPermitidas, usuarioId)
    const liquidacion = periodo === null ? null : await Liquidacion.findOne({ where: { periodo_id: periodo.id, trabajador_id: trabajador.id, vigente: true } })
    return liquidacion === null
        ? []
        : [`Recalcule la liquidación de ${String(periodo.mes).padStart(2, "0")}-${periodo.anio}: se calculó con la fecha de término que se quitó`]
}

// Elimina un finiquito calculado o emitido (nunca pagado) con el mes del término abierto. El emitido pide motivo.
// Opcionalmente quita también el término del trabajador. Toda eliminación queda en finiquitos_eliminados.
async function eliminarFiniquito(id, { motivo, quitar_termino: quitarTermino } = {}, empresasPermitidas, usuarioId) {
    const finiquito = await obtenerFiniquitoPermitido({ id }, empresasPermitidas)
    const trabajador = finiquito.Trabajador
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)

    if (finiquito.estado === "pagado") {
        throw new ConflictError("El finiquito ya está pagado: no se elimina; las diferencias se tratan como refiniquito")
    }
    const textoMotivo = typeof motivo === "string" ? motivo.trim() : ""
    if (finiquito.estado === "emitido" && textoMotivo === "") {
        throw new ValidationError("Para eliminar un finiquito emitido debe indicar el motivo")
    }
    const periodo = await exigirPeriodoDelTerminoAbierto(trabajador)

    await sequelize.transaction(async (transaction) => {
        await FiniquitoEliminado.create({
            trabajador_id: trabajador.id,
            finiquito_id: finiquito.id,
            estado: finiquito.estado,
            datos: finiquito.toJSON(),
            motivo: textoMotivo || null,
            quito_termino: quitarTermino === true,
            usuario_id: usuarioId
        }, { transaction })
        await finiquito.destroy({ transaction })
    })

    if (quitarTermino !== true) {
        return { eliminado: true, termino_quitado: false, advertencias: [] }
    }
    try {
        const advertencias = await quitarTerminoDe(trabajador, periodo, empresasPermitidas, usuarioId)
        return { eliminado: true, termino_quitado: true, advertencias }
    } catch (error) {
        return { eliminado: true, termino_quitado: false, advertencias: [`Se eliminó el finiquito, pero no se pudo quitar el término: ${error.message}`] }
    }
}

// Quita el término de un trabajador que no tiene finiquito (por ejemplo, registrado por error).
async function quitarTermino(trabajadorId, empresasPermitidas, usuarioId) {
    const trabajador = await Trabajador.findByPk(trabajadorId)
    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)
    if (!trabajador.fecha_termino) {
        throw new ConflictError("El trabajador no tiene término registrado")
    }
    if (await Finiquito.count({ where: { trabajador_id: trabajador.id } }) > 0) {
        throw new ConflictError("El trabajador tiene finiquito: elimínelo y marque «quitar también el término»")
    }
    const periodo = await exigirPeriodoDelTerminoAbierto(trabajador)
    const advertencias = await quitarTerminoDe(trabajador, periodo, empresasPermitidas, usuarioId)
    return { termino_quitado: true, advertencias }
}

async function emitirFiniquito(id, empresasPermitidas, usuarioId) {
    const finiquito = await obtenerFiniquitoPermitido({ id }, empresasPermitidas)

    await exigirRol(usuarioId, finiquito.Trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)

    if (finiquito.estado !== "calculado") {
        throw new ConflictError("El finiquito ya fue emitido")
    }

    const periodo = await exigirPeriodoAbierto(finiquito.Trabajador)
    await exigirSinLiquidacionesPosteriores(finiquito.Trabajador)

    const liquidacion = await Liquidacion.findOne({
        where: { periodo_id: periodo.id, trabajador_id: finiquito.trabajador_id, vigente: true }
    })

    if (liquidacion === null || liquidacion.estado === "calculada") {
        throw new ConflictError("La liquidación del mes del término debe estar emitida antes de emitir el finiquito")
    }

    const detalle = finiquito.detalle_calculo
    if (Number(liquidacion.saldo_pago_exceso) !== Number(detalle.saldoPagoExceso?.saldo ?? 0)) {
        throw new ConflictError("El saldo de pago en exceso de la liquidación del mes cambió después del cálculo; recalcule el finiquito antes de emitirlo")
    }
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
    recalcularFiniquito,
    eliminarFiniquito,
    quitarTermino,
    estadoSaldoFiniquito,
    obtenerFiniquito,
    emitirFiniquito,
    pagarFiniquito,
    documentoFiniquito
}