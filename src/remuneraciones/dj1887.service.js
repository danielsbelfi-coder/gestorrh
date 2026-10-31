const { Op } = require("sequelize")
const { Empresa, PeriodoRemuneracion, Liquidacion, LiquidacionLinea, ConceptoRemuneracion, Trabajador, Persona,
    Finiquito, ContratoTrabajo, ContratoAnexo } = require("../shared/associations.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { ConflictError, NotFoundError } = require("../shared/errors.js")
const { contratoDelMes } = require("./contrato_del_mes.js")
const { rangoDelPeriodo } = require("./periodo_remuneracion.service.js")
const { factoresDelAnio, validarAnio } = require("./factor_actualizacion.service.js")
const { MESES, problemasFactores, armarDj1887, horasDeContrato, archivoDj1887 } = require("./dj1887.js")

const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
// Cotizaciones de cargo del trabajador (códigos LRE), para las leyes sociales del resumen.
const COTIZACIONES_TRABAJADOR = [3141, 3143, 3144, 3146, 3151, 3154, 3155, 3156, 3157, 3158]

const nombreDe = (persona) => [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" ")
const listaMeses = (meses) => meses.map((mes) => NOMBRES_MES[mes - 1]).join(", ")

// Montos de una liquidación para la DJ (ver el SPEC: renta neta = base tributable del cálculo).
function montosLiquidacion(liquidacion) {
    const lineas = liquidacion.LiquidacionLineas.map((linea) => ({ ...linea, monto: Number(linea.monto) }))
    const sumar = (condicion) => lineas.filter(condicion).reduce((suma, linea) => suma + linea.monto, 0)
    const bruto = sumar((l) => l.tributable && l.tipo === "haber") - sumar((l) => l.tributable && l.tipo === "descuento")
    const detalle = liquidacion.detalle_calculo ?? {}
    const cotizaciones = sumar((l) => l.tipo === "descuento" && COTIZACIONES_TRABAJADOR.includes(l.ConceptoRemuneracion?.codigo_lre))

    return {
        bruto,
        rentaNeta: Math.round(Number(detalle.impuesto?.baseTributable ?? 0)),
        impuesto: sumar((l) => l.codigo === "IMPUESTO_UNICO"),
        noGravada: sumar((l) => l.tipo === "haber" && !l.tributable && l.codigo !== "AJUSTE_PAGO_EXCESO"),
        imponible: Math.round(Number(detalle.cotizaciones?.baseCotizaciones ?? 0)),
        leyesSociales: cotizaciones + Number(liquidacion.total_aportes_empleador ?? 0)
    }
}

// Contrato (con sus anexos firmados) que rige al trabajador en el mes.
function contratoEnMes(contratos, trabajadorId, anio, mes) {
    const { ultimoDia } = rangoDelPeriodo({ anio, mes })
    const delMes = contratos
        .filter((c) => c.trabajador_id === trabajadorId && c.fecha_inicio <= ultimoDia)
        .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
        .pop()
    if (!delMes) {
        return null
    }
    return contratoDelMes({ contrato: delMes, anexos: delMes.ContratoAnexos ?? [], anio, mes }).contrato
}

async function exigirEmpresa(empresaId, empresasPermitidas, usuarioId) {
    const id = Number(empresaId)
    if (!empresasPermitidas.includes(id)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    await exigirRol(usuarioId, id, PERMISOS.GENERAR_DJ)
    return await Empresa.findByPk(id)
}

// Meses del año sin periodo en el sistema en que la empresa tenía trabajadores vigentes.
async function mesesSinPeriodo(empresaId, anio, periodos) {
    const conPeriodo = new Set(periodos.map((p) => p.mes))
    const trabajadores = await Trabajador.findAll({
        where: { empresa_id: empresaId, estado: { [Op.ne]: "postulante" }, fecha_ingreso: { [Op.ne]: null } },
        attributes: ["fecha_ingreso", "fecha_termino"]
    })
    const hoy = new Date().toISOString().slice(0, 10)
    return MESES.filter((mes) => {
        const { primerDia, ultimoDia } = rangoDelPeriodo({ anio, mes })
        return !conPeriodo.has(mes) && primerDia <= hoy &&
            trabajadores.some((t) => t.fecha_ingreso <= ultimoDia && (t.fecha_termino === null || t.fecha_termino >= primerDia))
    })
}

async function datosDj1887({ empresa_id: empresaId, anio: anioTexto }, empresasPermitidas, usuarioId) {
    const empresa = await exigirEmpresa(empresaId, empresasPermitidas, usuarioId)
    const anio = validarAnio(anioTexto)

    const { factores } = await factoresDelAnio(anio)
    const faltan = problemasFactores(factores)
    if (faltan.length > 0) {
        throw new ConflictError(`Faltan los factores de actualización de ${anio} (${listaMeses(faltan)}). Los carga soporte en Parámetros legales cuando el SII los publica.`)
    }

    const periodos = await PeriodoRemuneracion.findAll({ where: { empresa_id: empresa.id, anio } })
    const abiertos = periodos.filter((p) => p.estado !== "cerrado").map((p) => p.mes).sort((a, b) => a - b)
    if (abiertos.length > 0) {
        throw new ConflictError(`La DJ se genera con todos los meses cerrados. Falta cerrar: ${listaMeses(abiertos)} de ${anio}.`)
    }
    if (periodos.length === 0) {
        throw new NotFoundError(`La empresa no tiene periodos de ${anio}`)
    }
    const mesDePeriodo = new Map(periodos.map((p) => [p.id, p.mes]))

    const liquidaciones = (await Liquidacion.findAll({
        where: { periodo_id: periodos.map((p) => p.id), vigente: true },
        include: [
            { model: LiquidacionLinea, include: [{ model: ConceptoRemuneracion, attributes: ["codigo_lre"] }] },
            { model: Trabajador, include: [Persona] }
        ]
    })).map((l) => l.toJSON())
    if (liquidaciones.length === 0) {
        throw new NotFoundError(`No hay liquidaciones en los periodos de ${anio}`)
    }

    const trabajadorIds = [...new Set(liquidaciones.map((l) => l.trabajador_id))]
    const contratos = (await ContratoTrabajo.findAll({
        where: { trabajador_id: trabajadorIds, estado: { [Op.ne]: "anulado" } },
        include: [ContratoAnexo]
    })).map((c) => c.toJSON())
    const finiquitos = await Finiquito.findAll({ where: { trabajador_id: trabajadorIds, estado: { [Op.ne]: "calculado" } } })
    const finiquitoDe = new Map(finiquitos.map((f) => [f.trabajador_id, f]))

    // persona_id → { persona, meses: { [mes]: { montos, relaciones: [trabajador] } } }
    const porPersona = new Map()
    for (const liquidacion of liquidaciones) {
        const trabajador = liquidacion.Trabajador
        const mes = mesDePeriodo.get(liquidacion.periodo_id)
        if (!porPersona.has(trabajador.persona_id)) {
            porPersona.set(trabajador.persona_id, { persona: trabajador.Persona, meses: {} })
        }
        const meses = porPersona.get(trabajador.persona_id).meses
        meses[mes] ??= { bruto: 0, rentaNeta: 0, impuesto: 0, noGravada: 0, imponible: 0, leyesSociales: 0, relaciones: [] }
        const montos = montosLiquidacion(liquidacion)
        for (const campo of Object.keys(montos)) {
            meses[mes][campo] += montos[campo]
        }
        meses[mes].relaciones.push(trabajador)

        const finiquito = finiquitoDe.get(trabajador.id)
        const { primerDia, ultimoDia } = rangoDelPeriodo({ anio, mes })
        if (finiquito && trabajador.fecha_termino >= primerDia && trabajador.fecha_termino <= ultimoDia) {
            meses[mes].noGravada += finiquito.monto_feriado + finiquito.monto_anios_servicio + finiquito.monto_aviso_previo
        }
    }

    const personas = [...porPersona.entries()].map(([personaId, { persona, meses }]) => {
        const salida = {}
        let ultimoContrato = null
        for (const [mesTexto, datos] of Object.entries(meses)) {
            const mes = Number(mesTexto)
            const { ultimoDia } = rangoDelPeriodo({ anio, mes })
            const relaciones = [...datos.relaciones].sort((a, b) => a.fecha_ingreso.localeCompare(b.fecha_ingreso))
            const ultima = relaciones[relaciones.length - 1]
            const contrato = contratoEnMes(contratos, ultima.id, anio, mes)
            const { relaciones: _, ...montos } = datos
            salida[mes] = {
                ...montos,
                jornada: contrato?.tipo_jornada ?? "completa",
                termina: ultima.fecha_termino !== null && ultima.fecha_termino <= ultimoDia
            }
            ultimoContrato = contrato
        }
        return {
            persona_id: personaId,
            rut: persona.rut,
            dv: persona.dv,
            nombre: nombreDe(persona),
            horas: horasDeContrato(ultimoContrato),
            meses: salida
        }
    })

    const sinPeriodo = await mesesSinPeriodo(empresa.id, anio, periodos)
    const avisos = sinPeriodo.length > 0
        ? [`No hay periodos en el sistema para ${listaMeses(sinPeriodo)} de ${anio}, con trabajadores vigentes. Esos meses no van en el archivo: complétalos en el formulario del SII.`]
        : []

    return { empresa, anio, factores, ...armarDj1887({ agricola: empresa.es_agricola === true, factores, personas }), avisos }
}

async function resumenDj1887(consulta, empresasPermitidas, usuarioId) {
    const { anio, factores, filas, resumen, avisos } = await datosDj1887(consulta, empresasPermitidas, usuarioId)
    return { anio, factores, filas, resumen, avisos }
}

async function archivoDj1887Empresa(consulta, empresasPermitidas, usuarioId) {
    const { empresa, anio, filas, avisos } = await datosDj1887(consulta, empresasPermitidas, usuarioId)
    return { nombre: `DJ1887_${empresa.rut}-${empresa.dv}_${anio}.csv`, contenido: archivoDj1887(filas), avisos }
}

async function certificadosDj1887(consulta, empresasPermitidas, usuarioId) {
    const { empresa, anio, filas } = await datosDj1887(consulta, empresasPermitidas, usuarioId)
    const elegidas = consulta.persona_id ? filas.filter((f) => f.persona_id === Number(consulta.persona_id)) : filas
    if (elegidas.length === 0) {
        throw new NotFoundError("La persona no tiene rentas en la DJ de ese año")
    }
    return { empresa: empresa.toJSON(), anio, filas: elegidas }
}

module.exports = { montosLiquidacion, resumenDj1887, archivoDj1887Empresa, certificadosDj1887 }
