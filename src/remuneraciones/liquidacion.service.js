const { Liquidacion, PeriodoRemuneracion, ContratoTrabajo,
    Trabajador, TramoImpuesto, SituacionPrevisional,
    Persona, Afp, ConceptoRemuneracion,
    ResumenAsistencia, VariablePeriodo, LiquidacionLinea,
    Empresa, LicenciaMedica, ContratoAnexo, Finiquito, LiquidacionEliminada } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { obtenerParametroVigente } = require("./parametro_legal.service.js")
const { obtenerPeriodoPorId, rangoDelPeriodo } = require("./periodo_remuneracion.service.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { sequelize } = require("../shared/database.js")
const { calcularDiasPago, DIAS_MES_COMERCIAL, rimaDelMes, diasPorTramo } = require("./dias_pago.js")
const { calcularLiquidacionPorLineas } = require("./calculo_lineas.js")
const { calcularAportesEmpleador } = require("./aportes_empleador.js")
const { contratoDelMes } = require("./contrato_del_mes.js")
const { fechasDeMarcas } = require("../asistencia/marcas_asistencia.js")
const { sumarDias, edadAl } = require("../shared/fechas.js")
const { situacionDelMes, tipoCotizante, reglasCotizante } = require("./tipo_cotizante.js")
const { saludParaCcaf, codigoTasaSaludCcaf } = require("./ccaf.js")
const { revisarArt58 } = require("./art58.js")

const FECHA_VIGENCIA_SEGURO_CESANTIA = "2002-10-01"
const ANIOS_MAXIMO_COTIZACION_CESANTIA = 11

function fechaOnceAnios(trabajador) {
    const anioIngreso = Number(trabajador.fecha_ingreso.slice(0, 4))
    const mesYDia = trabajador.fecha_ingreso.slice(4)
    return `${anioIngreso + ANIOS_MAXIMO_COTIZACION_CESANTIA}${mesYDia}`
}

function trabajadorCotizaCesantia(contrato, trabajador, primerDia) {
    const tipoContrato = contrato.tipo_contrato
    const fechaIngreso = trabajador.fecha_ingreso
    const fechaLimite = fechaOnceAnios(trabajador)

    if (tipoContrato === "indefinido" && fechaIngreso > FECHA_VIGENCIA_SEGURO_CESANTIA && primerDia < fechaLimite) {
        return true
    }

    return false
}

function tasaCesantiaEmpleador(contrato, trabajador, parametros, primerDia) {
    if (contrato.tipo_contrato !== "indefinido") {
        return parametros.cesantiaEmpleadorPlazoFijo
    }
    if (trabajador.fecha_ingreso <= FECHA_VIGENCIA_SEGURO_CESANTIA) {
        return 0
    }

    return primerDia < fechaOnceAnios(trabajador) ? parametros.cesantiaEmpleadorIndefinido : parametros.cesantiaEmpleador11Anios
}

const CODIGOS_SISTEMA = [
    "SUELDO_BASE", "GRATIFICACION", "DESCUENTO_ATRASOS", "ASIGNACION_FAMILIAR", "AFP", "SALUD",
    "SALUD_ADICIONAL_ISAPRE", "CESANTIA", "IMPUESTO_UNICO",
    "DESCUENTO_PAGO_EXCESO", "AJUSTE_PAGO_EXCESO",
    "APORTE_CESANTIA", "APORTE_MUTUAL", "APORTE_SANNA",
    "APORTE_SIS", "APORTE_EXPECTATIVA_VIDA", "APORTE_CUENTA_INDIVIDUAL", "APORTE_RENTABILIDAD_PROTEGIDA",
    "APVI_A", "APVI_B", "APVC_A", "APVC_B", "DEPOSITO_CONVENIDO", "DEPOSITO_CONVENIDO_EXCESO", "DESCUENTO_DEPOSITO_CONVENIDO", "APORTE_APVC"
]

async function obtenerConceptosSistema() {
    const conceptos = await ConceptoRemuneracion.findAll({
        where: { empresa_id: null, codigo: CODIGOS_SISTEMA }
    })

    const porCodigo = Object.fromEntries(conceptos.map((concepto) => [concepto.codigo, concepto]))
    const faltantes = CODIGOS_SISTEMA.filter((codigo) => !porCodigo[codigo])

    if (faltantes.length > 0) {
        throw new ConflictError(`Faltan conceptos del sistema en el catálogo: ${faltantes.join(", ")}`)
    }

    return porCodigo
}

async function obtenerResumenAprobado(periodoId, trabajadorId) {
    const resumen = await ResumenAsistencia.findOne({
        where: { periodo_id: periodoId, trabajador_id: trabajadorId }
    })

    if (resumen === null || resumen.estado !== "aprobado") {
        throw new ConflictError("El resumen de asistencia del trabajador no está aprobado")
    }

    return resumen
}

async function obtenerVariablesDelMes(periodoId, trabajadorId) {
    const variables = await VariablePeriodo.findAll({
        where: { periodo_id: periodoId, trabajador_id: trabajadorId },
        include: [ConceptoRemuneracion]
    })

    const aprobadas = variables
        .filter((variable) => variable.estado === "aprobada")
        .map((variable) => ({
            concepto: variable.ConceptoRemuneracion,
            cantidad: variable.cantidad,
            monto: variable.monto
        }))

    return { aprobadas, pendientes: variables.length - aprobadas.length }
}

// Saldo de pago en exceso que queda por descontar: el de la última liquidación vigente del trabajador en un periodo
// anterior (no solo el mes inmediatamente anterior: si un mes no tuvo liquidación, el saldo no se pierde).
// Depósito convenido ya enterado en el año por la persona en la empresa (todas sus relaciones), en los meses
// anteriores y en otra relación del mismo mes. Sirve para el tope anual de 900 UF.
async function depositoConvenidoDelAnio(periodo, trabajador) {
    const relaciones = await Trabajador.findAll({ where: { persona_id: trabajador.persona_id, empresa_id: trabajador.empresa_id }, attributes: ["id"] })
    const periodos = await PeriodoRemuneracion.findAll({
        where: { empresa_id: periodo.empresa_id, anio: periodo.anio, mes: { [Op.lte]: periodo.mes } },
        attributes: ["id", "mes"]
    })
    const mesDe = new Map(periodos.map((p) => [p.id, p.mes]))
    const liquidaciones = await Liquidacion.findAll({
        where: { periodo_id: [...mesDe.keys()], trabajador_id: relaciones.map((r) => r.id), vigente: true },
        attributes: ["id", "periodo_id", "trabajador_id"]
    })
    const previas = liquidaciones.filter((l) => mesDe.get(l.periodo_id) < periodo.mes || l.trabajador_id !== trabajador.id)
    if (previas.length === 0) {
        return 0
    }
    const lineas = await LiquidacionLinea.findAll({
        where: { liquidacion_id: previas.map((l) => l.id), codigo: ["DEPOSITO_CONVENIDO", "DEPOSITO_CONVENIDO_EXCESO"] },
        attributes: ["monto"]
    })
    return lineas.reduce((suma, linea) => suma + Number(linea.monto), 0)
}

async function obtenerSaldoAnterior(periodo, trabajadorId) {
    const liquidacionAnterior = await Liquidacion.findOne({
        where: { trabajador_id: trabajadorId, vigente: true },
        include: [{
            model: PeriodoRemuneracion,
            attributes: ["anio", "mes"],
            required: true,
            where: {
                empresa_id: periodo.empresa_id,
                [Op.or]: [{ anio: { [Op.lt]: periodo.anio } }, { anio: periodo.anio, mes: { [Op.lt]: periodo.mes } }]
            }
        }],
        order: [[PeriodoRemuneracion, "anio", "DESC"], [PeriodoRemuneracion, "mes", "DESC"]]
    })

    return liquidacionAnterior === null ? 0 : Number(liquidacionAnterior.saldo_pago_exceso)
}

// ¿La liquidación se calculó con un saldo anterior distinto del que hay ahora? (por ejemplo, porque después se
// recalculó el mes anterior). Se calcula al momento, para no guardar una marca que se pueda desincronizar.
async function saldoDesactualizado(liquidacion, periodo) {
    const guardado = Number(liquidacion.detalle_calculo?.saldoAnterior ?? 0)
    const actual = await obtenerSaldoAnterior(periodo, liquidacion.trabajador_id)
    return { desactualizado: guardado !== actual, guardado, actual }
}

// ---------- Dos relaciones laborales en el mismo mes ----------

// Otras relaciones (Trabajador) de la misma persona en la misma empresa que se cruzan con el mes del periodo:
// la anterior más cercana (ingreso antes que esta) y si hay alguna posterior (ingreso después).
async function relacionesDelMes(periodo, trabajador) {
    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)
    const otras = await Trabajador.findAll({
        where: {
            persona_id: trabajador.persona_id,
            empresa_id: trabajador.empresa_id,
            id: { [Op.ne]: trabajador.id },
            estado: { [Op.ne]: "postulante" },
            fecha_ingreso: { [Op.lte]: ultimoDia },
            [Op.or]: [{ fecha_termino: null }, { fecha_termino: { [Op.gte]: primerDia } }]
        },
        order: [["fecha_ingreso", "DESC"], ["id", "DESC"]]
    })
    const esAnterior = (otra) => otra.fecha_ingreso < trabajador.fecha_ingreso || (otra.fecha_ingreso === trabajador.fecha_ingreso && otra.id < trabajador.id)
    return {
        anterior: otras.find(esAnterior) ?? null,
        hayPosterior: otras.some((otra) => !esAnterior(otra))
    }
}

// Lo que ya usó en el mes la relación anterior (acumulado, por si hubo más de dos): base de cotizaciones, base de
// cesantía, base tributable, impuesto retenido y gratificación. null si no hay relación anterior.
// Lanza 409 si la relación anterior todavía no tiene su liquidación.
async function datosRelacionAnterior(periodo, trabajador) {
    const { anterior } = await relacionesDelMes(periodo, trabajador)
    if (anterior === null) {
        return null
    }
    const liquidacion = await Liquidacion.findOne({ where: { periodo_id: periodo.id, trabajador_id: anterior.id, vigente: true } })
    if (liquidacion === null) {
        const [anio, mes, dia] = anterior.fecha_ingreso.split("-")
        throw new ConflictError(`La persona tiene otra relación laboral en este mes (ingreso ${dia}-${mes}-${anio}): calcule primero esa liquidación, porque los topes y el impuesto del mes se comparten`)
    }
    const d = liquidacion.detalle_calculo ?? {}
    const previa = d.relacionAnterior ?? {}
    const suma = (propio, campo) => Number(propio ?? 0) + Number(previa[campo] ?? 0)
    return {
        trabajadorId: anterior.id,
        liquidacionId: liquidacion.id,
        baseCotizaciones: suma(d.cotizaciones?.baseCotizaciones, "baseCotizaciones"),
        baseCesantia: suma(d.cesantia?.base, "baseCesantia"),
        baseTributable: suma(d.impuesto?.baseTributable, "baseTributable"),
        impuesto: suma(liquidacion.monto_impuesto_unico, "impuesto"),
        gratificacion: suma(liquidacion.monto_gratificacion, "gratificacion")
    }
}

const CAMPOS_RELACION = ["baseCotizaciones", "baseCesantia", "baseTributable", "impuesto", "gratificacion"]

// ¿La liquidación se calculó con otros datos de la relación anterior del mes (o sin ella, o con una que ya no está)?
async function relacionDesactualizada(liquidacion, periodo) {
    const trabajador = await Trabajador.findByPk(liquidacion.trabajador_id)
    const guardada = liquidacion.detalle_calculo?.relacionAnterior ?? null
    let actual
    try {
        actual = await datosRelacionAnterior(periodo, trabajador)
    } catch {
        return { desactualizada: true }
    }
    if (guardada === null && actual === null) {
        return { desactualizada: false }
    }
    if (guardada === null || actual === null) {
        return { desactualizada: true }
    }
    return { desactualizada: CAMPOS_RELACION.some((campo) => Number(guardada[campo]) !== Number(actual[campo])) }
}

const MENSAJE_RELACION = "La otra relación laboral de la persona en este mes cambió (o se calculó después): recalcule esta liquidación antes de emitirla"

function mensajeSaldoDesactualizado({ guardado, actual }) {
    const pesos = (monto) => `$${monto.toLocaleString("es-CL")}`
    return `Cambió el saldo de pago en exceso del mes anterior (${pesos(guardado)} → ${pesos(actual)}): recalcule la liquidación antes de emitirla`
}

async function rimaDeLicencia(licencia, empresaId) {
    const anio = Number(licencia.fecha_inicio.slice(0, 4))
    const mes = Number(licencia.fecha_inicio.slice(5, 7))

    const anteriores = await Liquidacion.findAll({
        where: { trabajador_id: licencia.trabajador_id, vigente: true },
        include: [{
            model: PeriodoRemuneracion,
            required: true,
            where: {
                empresa_id: empresaId,
                [Op.or]: [{ anio: { [Op.lt]: anio } }, { anio, mes: { [Op.lt]: mes } }]
            }
        }],
        order: [[PeriodoRemuneracion, "anio", "DESC"], [PeriodoRemuneracion, "mes", "DESC"]]
    })

    const conRenta = anteriores.find((l) => Number(l.detalle_calculo?.cotizaciones?.rentaImponible ?? 0) > 0)

    return conRenta ? Number(conRenta.detalle_calculo.cotizaciones.rentaImponible) : 0
}

async function licenciasConRima(trabajadorId, periodo) {
    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)

    const licencias = await LicenciaMedica.findAll({
        where: {
            trabajador_id: trabajadorId,
            fecha_inicio: { [Op.lte]: ultimoDia },
            fecha_termino: { [Op.gte]: primerDia }
        },
        order: [["fecha_inicio", "ASC"]]
    })

    const resultado = []
    for (const licencia of licencias) {
        resultado.push({
            id: licencia.id,
            fecha_inicio: licencia.fecha_inicio,
            fecha_termino: licencia.fecha_termino,
            tipo: licencia.tipo,
            pagador_rut: licencia.pagador_rut,
            pagador_dv: licencia.pagador_dv,
            rima: await rimaDeLicencia(licencia, periodo.empresa_id)
        })
    }

    return resultado
}

async function fechasDeAusencia(trabajadorId, periodo, resumen, licencias) {
    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)
    const inasistencias = await fechasDeMarcas(trabajadorId, "inasistencia", primerDia, ultimoDia)
    const permisos = await fechasDeMarcas(trabajadorId, "permiso_sin_goce", primerDia, ultimoDia)

    if (inasistencias.length !== resumen.dias_inasistencia || permisos.length !== resumen.dias_permiso_sin_goce) {
        throw new ConflictError("Hay un cambio de sueldo a mitad de mes: los días de inasistencia y de permiso sin goce del resumen deben estar registrados con fecha en la asistencia")
    }

    const diasLicencia = []
    for (const licencia of licencias) {
        let fecha = licencia.fecha_inicio > primerDia ? licencia.fecha_inicio : primerDia
        const hasta = licencia.fecha_termino < ultimoDia ? licencia.fecha_termino : ultimoDia

        while (fecha <= hasta) {
            diasLicencia.push(fecha)
            fecha = sumarDias(fecha, 1)
        }
    }

    return [...inasistencias, ...permisos, ...diasLicencia]
}

const CODIGOS_PARAMETROS = {
    valorUF: "UF",
    valorUTM: "UTM",
    topeImponibleUF: "TOPE_IMPONIBLE_UF",
    cotizacionAfp: "COTIZACION_OBLIGATORIA_AFP",
    tasaSalud: "TASA_SALUD_MINIMA",
    tasaCesantia: "TASA_CESANTIA_TRABAJADOR",
    topeCesantiaUF: "TOPE_CESANTIA_UF",
    ingresoMinimoMensual: "INGRESO_MINIMO_MENSUAL",
    mutualBasica: "MUTUAL_TASA_BASICA",
    sanna: "LEY_SANNA",
    cesantiaEmpleadorIndefinido: "CESANTIA_EMPLEADOR_INDEFINIDO",
    cesantiaEmpleadorPlazoFijo: "CESANTIA_EMPLEADOR_PLAZO_FIJO",
    sis: "TASA_SIS",
    expectativaVida: "TASA_EXPECTATIVA_VIDA",
    cuentaIndividual: "REFORMA_CUENTA_INDIVIDUAL",
    rentabilidadProtegida: "REFORMA_RENTABILIDAD_PROTEGIDA",
    cesantiaEmpleador11Anios: "CESANTIA_EMPLEADOR_11_ANIOS",
}

async function obtenerParametrosDelMes(fecha) {
    const parametros = {}

    for (const [nombre, codigo] of Object.entries(CODIGOS_PARAMETROS)) {
        const parametro = await obtenerParametroVigente(codigo, fecha)

        if (parametro === null) {
            throw new ConflictError(`No existe un parámetro ${codigo} vigente para la fecha del periodo`)
        }

        parametros[nombre] = Number(parametro.valor)
    }

    return parametros
}

// Valor unitario por carga de los tramos A, B y C vigente en la fecha. Un tramo sin parámetro queda sin monto
// (el cálculo solo falla si la persona tiene cargas en ese tramo).
async function montosAsignacionFamiliar(fecha) {
    const { CODIGOS_MONTOS } = require("./montos_asignacion_familiar.js")
    const montos = {}
    for (const [tramo, codigo] of Object.entries(CODIGOS_MONTOS)) {
        const parametro = await obtenerParametroVigente(codigo, fecha)
        if (parametro !== null) {
            montos[tramo] = Number(parametro.valor)
        }
    }
    return montos
}

async function obtenerTramos(fecha) {
    const tramos = await TramoImpuesto.findAll({
        where: {
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [{ vigencia_hasta: null }, { vigencia_hasta: { [Op.gte]: fecha } }]
        },
        order: [["desde_utm", "ASC"]]
    })

    return tramos.map((t) => ({
        desdeUTM: Number(t.desde_utm),
        hastaUTM: t.hasta_utm === null ? null : Number(t.hasta_utm),
        tasa: Number(t.tasa),
        rebajaUTM: Number(t.rebaja_utm)
    }))
}

function filasLineas(lineasOrdenadas, liquidacionId) {
    return lineasOrdenadas.map((linea, indice) => ({
        liquidacion_id: liquidacionId,
        concepto_id: linea.concepto.id,
        codigo: linea.concepto.codigo,
        nombre: linea.concepto.nombre,
        tipo: linea.concepto.tipo,
        imponible: linea.concepto.imponible,
        tributable: linea.concepto.tributable,
        base_gratificacion: linea.concepto.base_gratificacion,
        cantidad: linea.cantidad,
        monto: linea.monto,
        orden: indice + 1
    }))
}

function advertenciasDe(pendientes, avisos = []) {
    return [
        ...(pendientes > 0 ? [`Hay ${pendientes} variable(s) pendiente(s) de aprobación que no se consideraron en el cálculo`] : []),
        ...avisos
    ]
}

async function obtenerTrabajadorDelPeriodo(periodo, trabajadorId) {
    const trabajador = await Trabajador.findByPk(trabajadorId, {
        include: [{ model: Persona, include: [{ model: Afp }] }]
    })

    if (trabajador === null || trabajador.empresa_id !== periodo.empresa_id) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    // Solo se liquida un mes en que la relación laboral existe (no antes del ingreso ni después del término).
    const { primerDia, ultimoDia } = rangoDelPeriodo(periodo)
    if (trabajador.fecha_ingreso > ultimoDia || (trabajador.fecha_termino !== null && trabajador.fecha_termino < primerDia)) {
        throw new ConflictError("El trabajador no tiene relación laboral en este periodo (ingresa después o terminó antes)")
    }

    return trabajador
}

async function prepararCalculo(periodo, trabajador) {
    const contratoVigente = await ContratoTrabajo.findOne({
        where: { trabajador_id: trabajador.id, estado: "vigente" }
    })

    if (contratoVigente === null) {
        throw new ConflictError("No existe un contrato vigente para este trabajador")
    }

    const anexos = await ContratoAnexo.findAll({ where: { contrato_id: contratoVigente.id } })
    const { contrato, tramosSueldo } = contratoDelMes({
        contrato: contratoVigente.toJSON(),
        anexos: anexos.map((anexo) => anexo.toJSON()),
        anio: periodo.anio,
        mes: periodo.mes
    })

    if (contrato === null) {
        throw new ConflictError("No existe un contrato vigente para este trabajador")
    }

    const persona = trabajador.Persona

    // La previsión (AFP y salud) que regía en el mes del periodo, no la de hoy.
    const { previsionEnMes } = require("../trabajadores/prevision_persona.service.js")
    const prevision = await previsionEnMes(persona, periodo.anio, periodo.mes)

    // El técnico extranjero (Ley 18.156) no cotiza en la AFP: puede no tener una asignada.
    const situacionesPersona = await SituacionPrevisional.findAll({ where: { persona_id: persona.id } })
    const situacionInicioMes = situacionDelMes(situacionesPersona.map((s) => s.toJSON()), `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}-01`)
    const tecnicoExtranjero = situacionInicioMes.tecnico_extranjero === true
    if (!prevision.afp && !tecnicoExtranjero) {
        throw new ConflictError("El trabajador no tiene una AFP asignada para este mes")
    }
    if (prevision.afp && prevision.afp.comision === null && !tecnicoExtranjero) {
        throw new ConflictError("La AFP del trabajador no tiene comisión registrada")
    }
    if (!prevision.sistema_salud) {
        throw new ConflictError("El trabajador no tiene un sistema de salud asignado para este mes")
    }
    if (prevision.sistema_salud === "Isapre" && prevision.plan_isapre_uf === null) {
        throw new ConflictError("El trabajador no tiene un valor de plan de isapre para este mes")
    }

    // Tramo y cargas familiares del mes (ver «Cargas familiares y asignación familiar» en el SPEC).
    const { asignacionEnMes } = require("../trabajadores/carga_familiar.service.js")
    const { calcularAsignacion } = require("./asignacion_familiar.js")
    const delMes = await asignacionEnMes(persona.id, periodo.anio, periodo.mes)

    // Dos relaciones en el mismo mes: la anterior debe estar calculada (topes e impuesto compartidos) y la asignación
    // familiar se paga una sola vez, en la última relación.
    const relacionAnterior = await datosRelacionAnterior(periodo, trabajador)
    const { hayPosterior } = await relacionesDelMes(periodo, trabajador)
    if (hayPosterior) {
        delMes.cargas = []
    }
    let asignacionFamiliar
    try {
        asignacionFamiliar = calcularAsignacion({
            tramo: delMes.tramo,
            cargas: delMes.cargas,
            montos: await montosAsignacionFamiliar(`${periodo.anio}-${String(periodo.mes).padStart(2, "0")}-01`)
        })
    } catch (error) {
        if (error.codigo === "sin_tramo") {
            // Mensaje con lo que hay que hacer: el tramo se registra en la ficha de la persona.
            const mes = `${String(periodo.mes).padStart(2, "0")}-${periodo.anio}`
            const nombre = [persona.nombres, persona.apellido_paterno].filter(Boolean).join(" ")
            throw new ConflictError(`Falta el tramo de asignación familiar de ${nombre}: tiene cargas vigentes en ${mes}. ` +
                `Regístrelo en Personas → ficha de ${nombre} → Cargas familiares → «Tramo de asignación familiar», ` +
                `desde ${mes} o el mes que indique el documento de la CCAF o del IPS, y vuelva a calcular`)
        }
        throw new ConflictError(error.message)
    }

    // APV individual, APV colectivo y depósito convenido vigentes en el mes (ficha de la persona).
    const { ahorrosEnMes } = require("../trabajadores/ahorro_voluntario.service.js")
    // Con dos relaciones en el mes, el APV y el depósito convenido se descuentan una sola vez, en la última relación.
    const ahorrosDelMes = hayPosterior ? [] : await ahorrosEnMes(persona.id, periodo.anio, periodo.mes)
    const depositoConvenidoAcumulado = ahorrosDelMes.some((a) => a.tipo === "deposito_convenido")
        ? await depositoConvenidoDelAnio(periodo, trabajador)
        : 0

    const resumen = await obtenerResumenAprobado(periodo.id, trabajador.id)
    const { aprobadas, pendientes } = await obtenerVariablesDelMes(periodo.id, trabajador.id)
    const conceptos = await obtenerConceptosSistema()
    const saldoPendiente = await obtenerSaldoAnterior(periodo, trabajador.id)

    const { diasNoContratado, diasPagados } = calcularDiasPago({
        anio: periodo.anio,
        mes: periodo.mes,
        fechaIngreso: trabajador.fecha_ingreso,
        fechaTermino: trabajador.fecha_termino,
        resumen
    })

    const licenciasDelMes = await licenciasConRima(trabajador.id, periodo)

    const fechasAusencia = tramosSueldo.length > 1
        ? await fechasDeAusencia(trabajador.id, periodo, resumen, licenciasDelMes)
        : []

    const tramosConDias = diasPorTramo({
        tramos: tramosSueldo,
        anio: periodo.anio,
        mes: periodo.mes,
        diasPagados,
        fechaIngreso: trabajador.fecha_ingreso,
        fechaTermino: trabajador.fecha_termino,
        fechasAusencia
    })

    const primerDia = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}-01`
    const situaciones = await SituacionPrevisional.findAll({ where: { persona_id: persona.id } })
    const situacion = situacionDelMes(situaciones.map((s) => s.toJSON()), primerDia)
    const tipoCotizanteMes = tipoCotizante(situacion, edadAl(persona.fecha_nacimiento, primerDia))
    const reglas = reglasCotizante(tipoCotizanteMes)
    const siSeguroSocial = (tasa) => reglas.seguroSocial ? tasa : 0
    const parametros = await obtenerParametrosDelMes(primerDia)
    const tramos = await obtenerTramos(primerDia)
    const empresa = await Empresa.findByPk(periodo.empresa_id)
    const tasasAportes = {
        cesantia: reglas.cesantia ? tasaCesantiaEmpleador(contrato, trabajador, parametros, primerDia) : 0,
        sis: siSeguroSocial(parametros.sis),
        expectativaVida: siSeguroSocial(parametros.expectativaVida),
        cuentaIndividual: siSeguroSocial(parametros.cuentaIndividual),
        rentabilidadProtegida: siSeguroSocial(parametros.rentabilidadProtegida),
        mutual: parametros.mutualBasica + Number(empresa.tasa_adicional_mutual),
        sanna: parametros.sanna
    }
    const datos = {
        sueldoBase: Number(contrato.sueldo_base),
        horasSemanales: Number(contrato.horas_semanales),
        diasPagados,
        tramosSueldo: tramosConDias,
        variables: aprobadas,
        minutosAtraso: resumen.minutos_atraso,
        ingresoMinimoMensual: parametros.ingresoMinimoMensual,
        asignacionFamiliar: {
            monto: asignacionFamiliar.monto,
            cargas: asignacionFamiliar.simples + asignacionFamiliar.maternales + asignacionFamiliar.invalidez
        },
        tasaAfp: reglas.afp ? parametros.cotizacionAfp + Number(prevision.afp.comision) : 0,
        tasaSalud: parametros.tasaSalud,
        planSaludUF: prevision.sistema_salud === "Isapre" ? Number(prevision.plan_isapre_uf) : 0,
        topeImponibleUF: parametros.topeImponibleUF,
        valorUF: parametros.valorUF,
        valorUTM: parametros.valorUTM,
        tasaCesantia: reglas.cesantia && trabajadorCotizaCesantia(contrato, trabajador, primerDia) ? parametros.tasaCesantia : 0,
        topeCesantiaUF: parametros.topeCesantiaUF,
        tramos,
        saldoPendiente,
        relacionAnterior,
        ahorros: ahorrosDelMes,
        depositoConvenidoAcumulado,
        conceptos
    }

    let resultado
    try {
        resultado = calcularLiquidacionPorLineas(datos)
    } catch (error) {
        throw new ConflictError(error.message)
    }


    const rimaMes = rimaDelMes(licenciasDelMes, periodo.anio, periodo.mes)
    const baseSeguroSocial = Math.min(resultado.baseCotizaciones + rimaMes, resultado.topeImponible)
    const { aportes, totalAportes } = calcularAportesEmpleador({
        baseCotizaciones: resultado.baseCotizaciones,
        baseCesantia: resultado.baseCesantia,
        baseSeguroSocial,
        tasas: tasasAportes,
        fijos: resultado.ahorros.apvc?.empleador > 0 ? [{ concepto: conceptos.APORTE_APVC, monto: resultado.ahorros.apvc.empleador }] : [],
        conceptos
    })

    // Caja de compensación de la empresa al calcular: Previred reparte el 7 % de Fonasa entre la caja y Fonasa
    // (activos 4,2 %; pensionados 1 %).
    let saludCcaf = 0
    let tasaSaludCcaf = null
    if (empresa.ccaf) {
        const codigoTasa = codigoTasaSaludCcaf(situacion.pensionado)
        const tasaCcaf = await obtenerParametroVigente(codigoTasa, primerDia)
        if (tasaCcaf === null) {
            throw new ConflictError(`No existe un parámetro ${codigoTasa} vigente para la fecha del periodo`)
        }
        tasaSaludCcaf = Number(tasaCcaf.valor)
        saludCcaf = saludParaCcaf({
            caja: empresa.ccaf,
            sistemaSalud: prevision.sistema_salud,
            baseCotizaciones: resultado.baseCotizaciones,
            saludLegal: resultado.descuentoSaludLegal,
            tasa: Number(tasaCcaf.valor)
        })
    }
    const avisos = resultado.nuevoSaldoPendiente > 0
        ? [`Los descuentos superan los haberes: queda un saldo de $${resultado.nuevoSaldoPendiente.toLocaleString("es-CL")} que se descontará el mes siguiente. Revise los descuentos voluntarios (CCAF, APV, anticipos)`]
        : []
    // Art. 58: descuentos voluntarios sobre el 15 % de los haberes imponibles. Solo se avisa.
    const art58 = revisarArt58(resultado.lineas, resultado.rentaImponible)
    if (art58.exceso > 0) {
        avisos.push(`Los descuentos voluntarios ($${art58.voluntarios.toLocaleString("es-CL")}) superan el 15 % de la remuneración imponible ($${art58.tope.toLocaleString("es-CL")}) que permite el art. 58 del Código del Trabajo, por $${art58.exceso.toLocaleString("es-CL")}. Se descuentan igual: revise los descuentos pactados`)
    }
    const exceso = resultado.ahorros.depositoConvenido?.exceso ?? 0
    if (exceso > 0) {
        avisos.push(`El depósito convenido del año supera las 900 UF: $${exceso.toLocaleString("es-CL")} de este mes pasan a ser renta tributable y pagan impuesto único (art. 20 del D.L. 3.500)`)
    }

    // Saldo de pago en exceso que quedó sin recuperar en el finiquito de una relación anterior: no se descuenta solo
    // (es otra relación laboral; requiere la autorización firmada del trabajador), pero se avisa.
    const { saldosDePersona } = require("./saldo_relaciones.service.js")
    const { saldoPendiente: pendienteDe } = require("./saldo_relaciones.js")
    const saldos = await saldosDePersona(persona.id, trabajador.empresa_id)
    const deOtrasRelaciones = saldos.finiquitos.filter((f) => f.trabajador_id !== trabajador.id)
    const pendienteAnterior = pendienteDe(deOtrasRelaciones, saldos.descontado)
    if (pendienteAnterior > 0) {
        avisos.push(`La persona tiene un saldo de pago en exceso de $${pendienteAnterior.toLocaleString("es-CL")} de una relación anterior que el finiquito no alcanzó a descontar. No se descuenta solo: con la autorización firmada del trabajador, ingréselo como variable «Descuento por pago en exceso»; si no se cobrará, márquelo en la ficha de la persona`)
    }

    // Si el trabajador ya tiene finiquito (no pagado) y este cálculo cambia el saldo que el finiquito descontó, se avisa.
    const finiquito = await Finiquito.findOne({ where: { trabajador_id: trabajador.id } })
    if (finiquito !== null && finiquito.estado !== "pagado" && trabajador.fecha_termino?.slice(0, 7) === primerDia.slice(0, 7)) {
        const saldoFiniquito = Number(finiquito.detalle_calculo?.saldoPagoExceso?.saldo ?? 0)
        if (saldoFiniquito !== resultado.nuevoSaldoPendiente) {
            const pesos = (monto) => `$${monto.toLocaleString("es-CL")}`
            avisos.push(`El finiquito se calculó con un saldo de pago en exceso de ${pesos(saldoFiniquito)} y ahora es ${pesos(resultado.nuevoSaldoPendiente)}: recalcule el finiquito (Finiquitos → Recalcular)`)
        }
    }
    const montoDe = (codigo) => resultado.lineas
        .filter((l) => l.concepto.codigo === codigo)
        .reduce((suma, l) => suma + l.monto, 0)
    const lineasHoras = resultado.lineas.filter((l) => l.concepto.recargo_hora_extra !== null)
    const lineasOrdenadas = [
        ...resultado.lineas.filter((l) => l.concepto.tipo === "haber"),
        ...resultado.lineas.filter((l) => l.concepto.tipo === "descuento"),
        ...aportes
    ]
    const detalleCalculo = {
        diasPago: {
            diasPagados,
            diasNoContratado,
            inasistencia: resumen.dias_inasistencia,
            licenciaMedica: resumen.dias_licencia_medica,
            permisoSinGoce: resumen.dias_permiso_sin_goce,
            vacaciones: resumen.dias_vacaciones,
            minutosAtraso: resumen.minutos_atraso
        },
        sueldo: { tramos: tramosConDias },
        cotizante: { tipo: tipoCotizanteMes, pensionado: situacion.pensionado, cotizaAfp: situacion.cotiza_afp, tipoPension: situacion.tipo_pension, tecnicoExtranjero: situacion.tecnico_extranjero === true },
        valorHoraOrdinaria: Math.round(resultado.valorHora * 100) / 100,
        gratificacion: { base: resultado.baseGratificacion, tope: resultado.topeGratificacion },
        cotizaciones: { rentaImponible: resultado.rentaImponible, topeImponible: resultado.topeImponible, baseCotizaciones: resultado.baseCotizaciones },
        // Los identificadores permiten que el PDF, el LRE y Previred usen la previsión de este mes aunque la persona cambie después.
        afp: { id: prevision.afp?.id ?? null, codigo: prevision.afp?.codigo ?? null, tasa: datos.tasaAfp },
        salud: { sistema: prevision.sistema_salud, isapre_id: prevision.sistema_salud === "Isapre" ? prevision.isapre?.id ?? null : null, planUF: datos.planSaludUF, legal: resultado.descuentoSaludLegal, adicionalIsapre: resultado.descuentoAdicionalIsapre },
        // Tramo y número de cargas del mes: Previred y el LRE los informan aunque la persona cambie después.
        asignacionFamiliar,
        // APV y depósito convenido (institución, contrato, forma de pago, régimen y montos) y caja de la empresa.
        apv: resultado.ahorros,
        ccaf: { caja: empresa.ccaf ?? null, saludCcaf, tasa: tasaSaludCcaf },
        art58,
        cesantia: { tasa: datos.tasaCesantia, base: resultado.baseCesantia, tope: resultado.topeCesantia },
        impuesto: { baseTributable: resultado.baseTributable, baseTributableMes: resultado.baseTributableMes, baseEnUTM: resultado.baseEnUTM, tasa: resultado.tramo.tasa, rebajaUTM: resultado.tramo.rebajaUTM },
        // Dos relaciones en el mismo mes: lo que ya había usado la anterior (para detectar si después cambia).
        relacionAnterior,
        saldoAnterior: saldoPendiente,
        variablesPendientes: pendientes,
        aportes: { tasas: tasasAportes, total: totalAportes, rimaMes, baseSeguroSocial },
        licencias: licenciasDelMes
    }
    const campos = {
        snapshot_contrato: {
            sueldo_base: contrato.sueldo_base,
            horas_semanales: contrato.horas_semanales,
            tipo_contrato: contrato.tipo_contrato,
            cargo_id: contrato.cargo_id,
            sistema_remuneracion: contrato.sistema_remuneracion,
            periodicidad_pago: contrato.periodicidad_pago
        },
        dias_trabajados: diasPagados,
        dias_periodo: DIAS_MES_COMERCIAL,
        sueldo_base_proporcional: montoDe("SUELDO_BASE"),
        horas_extra: lineasHoras.reduce((suma, l) => suma + l.cantidad, 0),
        valor_hora_extra: Math.round(resultado.valorHora * 1.5),
        monto_horas_extra: lineasHoras.reduce((suma, l) => suma + l.monto, 0),
        monto_gratificacion: montoDe("GRATIFICACION"),
        total_haberes: resultado.totalHaberes,
        descuento_afp: montoDe("AFP"),
        descuento_salud: montoDe("SALUD") + montoDe("SALUD_ADICIONAL_ISAPRE"),
        descuento_cesantia: montoDe("CESANTIA"),
        monto_impuesto_unico: montoDe("IMPUESTO_UNICO"),
        total_descuentos: resultado.totalDescuentos,
        liquido_a_pagar: resultado.liquidoAPagar,
        total_aportes_empleador: totalAportes,
        saldo_pago_exceso: resultado.nuevoSaldoPendiente,
        detalle_calculo: detalleCalculo,
        fecha_calculo: new Date().toISOString().slice(0, 10)
    }

    return { campos, lineasOrdenadas, pendientes, avisos }
}

async function crearLiquidacion(periodo_id, trabajador_id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.CALCULAR_LIQUIDACION)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }

    const trabajador = await obtenerTrabajadorDelPeriodo(periodo, trabajador_id)

    const vigente = await Liquidacion.findOne({
        where: { periodo_id: periodo.id, trabajador_id: trabajador.id, vigente: true }
    })

    if (vigente !== null && vigente.estado !== "calculada") {
        throw new ConflictError("La liquidación ya fue emitida; para modificarla use el recálculo")
    }

    const { campos, lineasOrdenadas, pendientes, avisos } = await prepararCalculo(periodo, trabajador)

    const liquidacion = await sequelize.transaction(async (transaction) => {
        if (vigente !== null) {
            await vigente.update(campos, { transaction })
            await LiquidacionLinea.destroy({ where: { liquidacion_id: vigente.id }, transaction })
            await LiquidacionLinea.bulkCreate(filasLineas(lineasOrdenadas, vigente.id), { transaction })
            return vigente
        }

        const nueva = await Liquidacion.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...campos,
            version: 1,
            vigente: true
        }, { transaction })

        await LiquidacionLinea.bulkCreate(filasLineas(lineasOrdenadas, nueva.id), { transaction })

        return nueva
    })

    return { liquidacion, advertencias: advertenciasDe(pendientes, avisos), reemplazada: vigente !== null }
}

async function recalcularLiquidacion(periodo_id, liquidacion_id, motivo, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.CALCULAR_LIQUIDACION)

    const anterior = await Liquidacion.findOne({
        where: { id: liquidacion_id, periodo_id: periodo.id }
    })

    if (anterior === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }

    if (typeof motivo !== "string" || motivo.trim() === "") {
        throw new ValidationError("Debe indicar el motivo del recálculo")
    }

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }
    if (!anterior.vigente) {
        throw new ConflictError("Solo se puede recalcular la versión vigente de la liquidación")
    }
    if (anterior.estado === "calculada") {
        throw new ConflictError("La liquidación está en borrador; recalcúlela desde el cálculo normal")
    }

    const trabajador = await obtenerTrabajadorDelPeriodo(periodo, anterior.trabajador_id)

    const { campos, lineasOrdenadas, pendientes, avisos } = await prepararCalculo(periodo, trabajador)

    const liquidacion = await sequelize.transaction(async (transaction) => {
        await anterior.update({ vigente: false }, { transaction })

        const nueva = await Liquidacion.create({
            periodo_id: periodo.id,
            trabajador_id: trabajador.id,
            ...campos,
            version: anterior.version + 1,
            vigente: true,
            reemplaza_a_id: anterior.id,
            motivo_version: motivo.trim()
        }, { transaction })

        await LiquidacionLinea.bulkCreate(filasLineas(lineasOrdenadas, nueva.id), { transaction })

        return nueva
    })

    return { liquidacion, advertencias: advertenciasDe(pendientes, avisos) }
}

async function validarEmision(periodo, liquidacion) {
    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }
    if (!liquidacion.vigente) {
        throw new ConflictError("Solo se puede emitir la versión vigente de la liquidación")
    }
    if (liquidacion.estado !== "calculada") {
        throw new ConflictError("La liquidación ya fue emitida")
    }

    const filtro = { periodo_id: periodo.id, trabajador_id: liquidacion.trabajador_id }

    const pendientes = await VariablePeriodo.count({ where: { ...filtro, estado: "pendiente" } })

    if (pendientes > 0) {
        throw new ConflictError(`El trabajador tiene ${pendientes} variable(s) pendiente(s) de aprobación`)
    }

    const despues = { updatedAt: { [Op.gt]: liquidacion.updatedAt } }
    const cambiosVariables = await VariablePeriodo.count({ where: { ...filtro, ...despues } })
    const cambiosResumen = await ResumenAsistencia.count({ where: { ...filtro, ...despues } })

    if (cambiosVariables + cambiosResumen > 0) {
        throw new ConflictError("Hubo cambios en las variables o en la asistencia después del cálculo; recalcule antes de emitir")
    }

    const saldo = await saldoDesactualizado(liquidacion, periodo)
    if (saldo.desactualizado) {
        throw new ConflictError(mensajeSaldoDesactualizado(saldo))
    }
    if ((await relacionDesactualizada(liquidacion, periodo)).desactualizada) {
        throw new ConflictError(MENSAJE_RELACION)
    }
}

async function emitirLiquidacion(periodo_id, liquidacion_id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.EMITIR_LIQUIDACION)

    const liquidacion = await Liquidacion.findOne({
        where: { id: liquidacion_id, periodo_id: periodo.id }
    })

    if (liquidacion === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }

    await validarEmision(periodo, liquidacion)

    return await liquidacion.update({
        estado: "emitida",
        fecha_emision: new Date(),
        emitido_por_id: usuarioId
    })
}

async function emitirLiquidacionesPeriodo(periodo_id, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.EMITIR_LIQUIDACION)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }

    const calculadas = await Liquidacion.findAll({
        where: { periodo_id: periodo.id, vigente: true, estado: "calculada" }
    })

    if (calculadas.length === 0) {
        throw new ConflictError("No hay liquidaciones calculadas para emitir en este periodo")
    }

    const problemas = []

    for (const liquidacion of calculadas) {
        try {
            await validarEmision(periodo, liquidacion)
        } catch (error) {
            if (!(error instanceof ConflictError)) {
                throw error
            }
            problemas.push({ id: liquidacion.id, trabajador_id: liquidacion.trabajador_id, motivo: error.message })
        }
    }

    if (problemas.length > 0) {
        return { emitidas: 0, problemas }
    }

    const fechaEmision = new Date()

    await sequelize.transaction(async (transaction) => {
        for (const liquidacion of calculadas) {
            await liquidacion.update({ estado: "emitida", fecha_emision: fechaEmision, emitido_por_id: usuarioId }, { transaction })
        }
    })

    return { emitidas: calculadas.length, problemas: [] }
}

// Cada liquidación con el saldo que descuenta del mes anterior y si ese saldo quedó desactualizado.
// Elimina la liquidación de un trabajador en un periodo abierto (todas sus versiones). La emitida pide motivo.
// Toda eliminación queda en liquidaciones_eliminadas. Si el mes siguiente usaba su saldo de pago en exceso o era la
// relación anterior del mes, esas liquidaciones quedan marcadas para recalcular (los avisos que ya existen).
async function eliminarLiquidacion(periodo_id, liquidacion_id, motivo, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodo_id, empresasPermitidas)
    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.CALCULAR_LIQUIDACION)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones se encuentra cerrado")
    }
    const liquidacion = await Liquidacion.findOne({ where: { id: liquidacion_id, periodo_id: periodo.id, vigente: true } })
    if (liquidacion === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }
    const texto = typeof motivo === "string" ? motivo.trim() : ""
    if (liquidacion.estado === "emitida" && texto === "") {
        throw new ValidationError("Para eliminar una liquidación emitida debe indicar el motivo")
    }
    const finiquito = await Finiquito.findOne({ where: { trabajador_id: liquidacion.trabajador_id } })
    const trabajador = await Trabajador.findByPk(liquidacion.trabajador_id)
    const mes = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`
    if (finiquito !== null && finiquito.estado !== "calculado" && trabajador.fecha_termino?.slice(0, 7) === mes) {
        throw new ConflictError("El trabajador tiene su finiquito emitido en este mes: elimine primero el finiquito")
    }

    const versiones = await Liquidacion.findAll({
        where: { periodo_id: periodo.id, trabajador_id: liquidacion.trabajador_id },
        include: [LiquidacionLinea],
        order: [["version", "DESC"]]
    })

    await sequelize.transaction(async (transaction) => {
        await LiquidacionEliminada.create({
            trabajador_id: liquidacion.trabajador_id,
            periodo_id: periodo.id,
            estado: liquidacion.estado,
            datos: versiones.map((v) => v.toJSON()),
            motivo: texto || null,
            usuario_id: usuarioId
        }, { transaction })
        const ids = versiones.map((v) => v.id)
        await LiquidacionLinea.destroy({ where: { liquidacion_id: ids }, transaction })
        await Liquidacion.update({ reemplaza_a_id: null }, { where: { id: ids }, transaction })
        await Liquidacion.destroy({ where: { id: ids }, transaction })
    })

    return { eliminada: true, versiones: versiones.length }
}

async function listarLiquidaciones(periodo_id, empresasPermitidas) {
    const liquidaciones = await Liquidacion.findAll({
        where: { periodo_id: periodo_id, vigente: true },
        include: [{
            model: PeriodoRemuneracion,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            }, required: true
        }]
    })

    const resultado = []
    for (const liquidacion of liquidaciones) {
        const saldo = await saldoDesactualizado(liquidacion, liquidacion.PeriodoRemuneracion)
        const relacion = await relacionDesactualizada(liquidacion, liquidacion.PeriodoRemuneracion)
        resultado.push({
            ...liquidacion.toJSON(),
            relacion_desactualizada: relacion.desactualizada,
            saldo_anterior: saldo.guardado,
            saldo_desactualizado: saldo.desactualizado,
            saldo_anterior_actual: saldo.actual
        })
    }
    return resultado
}

async function obtenerLiquidacionPorId(id, empresasPermitidas) {
    const liquidacion = await Liquidacion.findByPk(id, {
        include: [{
            model: PeriodoRemuneracion,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            },
            required: true
        }]
    },
    )

    if (liquidacion === null) {
        throw new NotFoundError("Liquidación no encontrada")
    }

    return liquidacion
}


module.exports = {
    crearLiquidacion,
    listarLiquidaciones,
    obtenerLiquidacionPorId,
    recalcularLiquidacion,
    emitirLiquidacion,
    emitirLiquidacionesPeriodo,
    saldoDesactualizado,
    relacionDesactualizada,
    eliminarLiquidacion,
    CODIGOS_PARAMETROS
}