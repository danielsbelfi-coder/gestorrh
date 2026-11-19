// Variables permanentes y préstamos en cuotas: se definen una vez, aprobadas (quien las crea debe poder aprobar
// variables), y se agregan solas como variables aprobadas a cada mes abierto que les toca. Ver «Paquete P» en el SPEC.
const { Op } = require("sequelize")
const { VariableRecurrente, VariablePeriodo, PeriodoRemuneracion, Trabajador, ConceptoRemuneracion, Liquidacion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { enMes, saldoAlTermino, validarRecurrente, indiceMes } = require("./recurrentes.js")

const nombreMes = (iso) => `${String(iso).slice(5, 7)}-${String(iso).slice(0, 4)}`
const primerDia = (p) => `${p.anio}-${String(p.mes).padStart(2, "0")}-01`
const ultimoDia = (p) => `${p.anio}-${String(p.mes).padStart(2, "0")}-${String(new Date(Date.UTC(p.anio, p.mes, 0)).getUTCDate()).padStart(2, "0")}`

// La relación tiene liquidación en el mes del periodo: ingresó antes del fin del mes y no terminó antes de su inicio.
function relacionEnMes(trabajador, periodo) {
    return trabajador.estado !== "postulante"
        && Boolean(trabajador.fecha_ingreso) && trabajador.fecha_ingreso <= ultimoDia(periodo)
        && (!trabajador.fecha_termino || trabajador.fecha_termino >= primerDia(periodo))
}

async function trabajadorPermitido(trabajadorId, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(trabajadorId)
    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    return trabajador
}

async function conceptoParaRecurrente(conceptoId, empresaId, tipo) {
    const concepto = await ConceptoRemuneracion.findByPk(conceptoId)
    if (concepto === null || (concepto.empresa_id !== null && concepto.empresa_id !== empresaId)) {
        throw new NotFoundError("Concepto no encontrado")
    }
    if (concepto.activo === false) {
        throw new ConflictError("El concepto está inactivo")
    }
    if (concepto.calculado_por_sistema || concepto.recargo_hora_extra !== null || !["haber", "descuento"].includes(concepto.tipo)) {
        throw new ValidationError("Ese concepto no se puede dejar permanente: solo haberes y descuentos que se ingresan a mano, sin horas extra")
    }
    if (tipo === "cuotas" && concepto.tipo !== "descuento") {
        throw new ValidationError("Un préstamo en cuotas se descuenta: elige un concepto de descuento (por ejemplo, «Préstamo de la empresa»)")
    }
    return concepto
}

// Meses cerrados (periodos de la empresa con estado cerrado) en los que la recurrente ya se aplicó.
async function mesesCerradosAplicados(recurrenteId) {
    const filas = await VariablePeriodo.findAll({
        where: { recurrente_id: recurrenteId },
        include: [{ model: PeriodoRemuneracion, where: { estado: "cerrado" }, required: true }]
    })
    return filas.map((f) => primerDia(f.PeriodoRemuneracion)).sort()
}

// El primer mes no puede ser de un periodo ya cerrado: esas liquidaciones no cambian y las cuotas se contarían como pagadas.
async function exigirDesdeAbierto(empresaId, desdeMes) {
    const anio = Number(desdeMes.slice(0, 4))
    const mes = Number(desdeMes.slice(5, 7))
    const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: empresaId, anio, mes } })
    if (periodo !== null && periodo.estado === "cerrado") {
        throw new ConflictError(`El mes ${nombreMes(desdeMes)} ya está cerrado: la variable debe empezar en un mes abierto o futuro`)
    }
}

// Agrega, actualiza o quita las variables del periodo (abierto) que vienen de recurrentes. Idempotente. No toca a un
// trabajador con su liquidación del mes ya emitida. Con trabajadorId, solo ese trabajador.
async function materializarPeriodo(periodo, { trabajadorId = null, transaction } = {}) {
    if (periodo.estado !== "abierto") {
        return
    }
    const recurrentes = await VariableRecurrente.findAll({
        include: [{ model: Trabajador, required: true, where: { empresa_id: periodo.empresa_id, ...(trabajadorId ? { id: trabajadorId } : {}) } }],
        transaction
    })
    const existentes = await VariablePeriodo.findAll({
        where: { periodo_id: periodo.id, recurrente_id: { [Op.ne]: null }, ...(trabajadorId ? { trabajador_id: trabajadorId } : {}) },
        transaction
    })
    const emitidas = new Set((await Liquidacion.findAll({
        where: { periodo_id: periodo.id, vigente: true, estado: "emitida" }, attributes: ["trabajador_id"], transaction
    })).map((l) => l.trabajador_id))

    const porRecurrente = new Map(existentes.map((v) => [v.recurrente_id, v]))
    const vigentes = new Set()
    for (const r of recurrentes) {
        if (emitidas.has(r.trabajador_id)) {
            vigentes.add(r.id)
            continue
        }
        const deseada = relacionEnMes(r.Trabajador, periodo) ? enMes(r, periodo.anio, periodo.mes) : null
        const actual = porRecurrente.get(r.id)
        if (deseada === null) {
            continue
        }
        vigentes.add(r.id)
        const valores = {
            concepto_id: r.concepto_id,
            monto: deseada.monto,
            numero_cuota: deseada.numeroCuota,
            proporcional: deseada.proporcional,
            glosa: deseada.glosa
        }
        if (!actual) {
            await VariablePeriodo.create({
                ...valores,
                periodo_id: periodo.id,
                trabajador_id: r.trabajador_id,
                cantidad: null,
                estado: "aprobada",
                fuente: "recurrente",
                recurrente_id: r.id,
                usuario_registro_id: r.usuario_creo_id,
                aprobado_por_id: r.usuario_creo_id,
                fecha_aprobacion: new Date()
            }, { transaction })
        } else if (Object.entries(valores).some(([campo, valor]) => actual[campo] !== valor)) {
            await actual.update(valores, { transaction })
        }
    }
    for (const v of existentes) {
        if (!vigentes.has(v.recurrente_id) && !emitidas.has(v.trabajador_id)) {
            await v.destroy({ transaction })
        }
    }
}

// Aplica la recurrente en los periodos abiertos de la empresa (al crearla, cambiarla o borrarla).
async function materializarAbiertos(empresaId, trabajadorId) {
    const abiertos = await PeriodoRemuneracion.findAll({ where: { empresa_id: empresaId, estado: "abierto" } })
    for (const periodo of abiertos) {
        await materializarPeriodo(periodo, { trabajadorId })
    }
}

async function crearRecurrente(entrada, empresasPermitidas, usuarioId) {
    const trabajador = await trabajadorPermitido(entrada.trabajador_id, empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_VARIABLES)

    const { errores, datos } = validarRecurrente(entrada)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    await conceptoParaRecurrente(entrada.concepto_id, trabajador.empresa_id, datos.tipo)
    if (trabajador.fecha_termino && datos.desde_mes > trabajador.fecha_termino) {
        throw new ConflictError("La relación laboral ya terminó antes de ese mes")
    }
    await exigirDesdeAbierto(trabajador.empresa_id, datos.desde_mes)

    const recurrente = await VariableRecurrente.create({
        ...datos,
        trabajador_id: trabajador.id,
        concepto_id: Number(entrada.concepto_id),
        usuario_creo_id: usuarioId
    })
    await materializarAbiertos(trabajador.empresa_id, trabajador.id)
    return recurrente
}

async function listarRecurrentes(empresaId, empresasPermitidas) {
    const id = Number(empresaId)
    if (!empresasPermitidas.includes(id)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    const recurrentes = await VariableRecurrente.findAll({
        include: [
            { model: Trabajador, required: true, where: { empresa_id: id } },
            { model: ConceptoRemuneracion, attributes: ["codigo", "nombre", "tipo"] },
            { model: VariablePeriodo, include: [{ model: PeriodoRemuneracion, attributes: ["anio", "mes", "estado"] }] }
        ],
        order: [["id", "ASC"]]
    })
    return recurrentes.map((r) => {
        const aplicadas = r.VariablesPeriodo
            .map((v) => ({ mes: primerDia(v.PeriodoRemuneracion), monto: v.monto, numero_cuota: v.numero_cuota, cerrado: v.PeriodoRemuneracion.estado === "cerrado" }))
            .sort((a, b) => a.mes.localeCompare(b.mes))
        const termino = r.Trabajador.fecha_termino
        return {
            id: r.id,
            trabajador_id: r.trabajador_id,
            concepto_id: r.concepto_id,
            concepto: r.ConceptoRemuneracion,
            tipo: r.tipo,
            monto: r.monto,
            cuotas: r.cuotas,
            proporcional: r.proporcional,
            desde_mes: r.desde_mes,
            hasta_mes: r.hasta_mes,
            glosa: r.glosa,
            aplicadas,
            saldo_al_termino: r.tipo === "cuotas" && termino ? saldoAlTermino(r, termino) : null
        }
    })
}

async function recurrentePermitida(id, empresasPermitidas, usuarioId) {
    const recurrente = await VariableRecurrente.findByPk(id, { include: [Trabajador] })
    if (recurrente === null || !empresasPermitidas.includes(recurrente.Trabajador.empresa_id)) {
        throw new NotFoundError("Variable permanente o préstamo no encontrado")
    }
    await exigirRol(usuarioId, recurrente.Trabajador.empresa_id, PERMISOS.APROBAR_VARIABLES)
    return recurrente
}

// Cambia una recurrente. Lo ya aplicado en meses cerrados no cambia. Permanente: monto, proporcional, glosa y «hasta»
// (no antes del último mes cerrado en que se aplicó; null = hasta el término). Préstamo: la glosa siempre; el monto,
// las cuotas y el primer mes solo si todavía no se aplicó en un mes cerrado.
async function editarRecurrente(id, entrada, empresasPermitidas, usuarioId) {
    const recurrente = await recurrentePermitida(id, empresasPermitidas, usuarioId)
    const cerrados = await mesesCerradosAplicados(recurrente.id)
    const combinada = {
        tipo: recurrente.tipo,
        monto: entrada.monto ?? recurrente.monto,
        cuotas: entrada.cuotas ?? recurrente.cuotas,
        proporcional: entrada.proporcional ?? recurrente.proporcional,
        desde_mes: entrada.desde_mes ?? recurrente.desde_mes,
        hasta_mes: entrada.hasta_mes !== undefined ? entrada.hasta_mes : recurrente.hasta_mes,
        glosa: entrada.glosa !== undefined ? entrada.glosa : recurrente.glosa
    }
    const { errores, datos } = validarRecurrente(combinada)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }
    if (cerrados.length > 0) {
        const cambiaInicio = datos.desde_mes !== recurrente.desde_mes
        const cambiaPrestamo = recurrente.tipo === "cuotas" && (datos.monto !== recurrente.monto || datos.cuotas !== recurrente.cuotas)
        if (cambiaInicio || cambiaPrestamo) {
            throw new ConflictError(`Ya se aplicó en meses cerrados (${cerrados.map(nombreMes).join(", ")}): no se cambia ${cambiaInicio ? "el primer mes" : "el monto ni las cuotas"}. Para otro préstamo, crea uno nuevo`)
        }
        const ultimo = cerrados[cerrados.length - 1]
        if (datos.hasta_mes && datos.hasta_mes < ultimo) {
            throw new ConflictError(`Ya se aplicó en ${nombreMes(ultimo)}, que está cerrado: «hasta» no puede ser anterior a ese mes`)
        }
    } else if (datos.desde_mes !== recurrente.desde_mes) {
        await exigirDesdeAbierto(recurrente.Trabajador.empresa_id, datos.desde_mes)
    }
    await recurrente.update(datos)
    await materializarAbiertos(recurrente.Trabajador.empresa_id, recurrente.trabajador_id)
    return recurrente
}

// Se borra solo si no se aplicó en un mes cerrado (si no, se termina con «hasta»). Sus variables de meses abiertos se
// quitan; si una liquidación ya estaba calculada, emitirla exige recalcular.
async function eliminarRecurrente(id, empresasPermitidas, usuarioId) {
    const recurrente = await recurrentePermitida(id, empresasPermitidas, usuarioId)
    const cerrados = await mesesCerradosAplicados(recurrente.id)
    if (cerrados.length > 0) {
        throw new ConflictError(`Ya se aplicó en meses cerrados (${cerrados.map(nombreMes).join(", ")}): no se borra. ${recurrente.tipo === "permanente" ? "Termínala indicando el mes «hasta»" : "Las cuotas que faltan se descuentan en los meses siguientes o en el finiquito"}`)
    }
    const emitida = await VariablePeriodo.count({
        where: { recurrente_id: recurrente.id },
        include: [{ model: PeriodoRemuneracion, required: true, include: [{ model: Liquidacion, required: true, where: { vigente: true, estado: "emitida", trabajador_id: recurrente.trabajador_id } }] }]
    })
    if (emitida > 0) {
        throw new ConflictError("Ya entró en una liquidación emitida: no se borra")
    }
    await VariablePeriodo.destroy({ where: { recurrente_id: recurrente.id } })
    await recurrente.destroy()
}

// Préstamos en cuotas con saldo al término de la relación: se proponen como descuento en el finiquito (código 3188).
async function saldosAlTermino(trabajadorId, empresasPermitidas) {
    const trabajador = await trabajadorPermitido(trabajadorId, empresasPermitidas)
    if (!trabajador.fecha_termino) {
        return []
    }
    const prestamos = await VariableRecurrente.findAll({ where: { trabajador_id: trabajador.id, tipo: "cuotas" }, order: [["id", "ASC"]] })
    return prestamos
        .map((r) => ({ id: r.id, glosa: r.glosa || "Préstamo", cuotas: r.cuotas, ...saldoAlTermino(r, trabajador.fecha_termino) }))
        .filter((s) => s.saldo > 0)
}

module.exports = {
    crearRecurrente,
    listarRecurrentes,
    editarRecurrente,
    eliminarRecurrente,
    saldosAlTermino,
    materializarPeriodo,
    relacionEnMes,
    indiceMes
}
