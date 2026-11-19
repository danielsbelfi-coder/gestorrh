const { VariablePeriodo, Trabajador, ConceptoRemuneracion, PeriodoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { leerMesOrigen } = require("./horas_extra.js")

// Horas extra manuales: solo de un mes ya cerrado (anterior al periodo y sin periodo abierto en la empresa).
// Las del mes se registran en el libro de asistencia. Para los demás conceptos el mes de origen no aplica (null).
async function mesOrigenDeVariable(concepto, datos, periodo) {
    if (concepto.recargo_hora_extra === null) {
        return null
    }
    let mesOrigen
    try {
        mesOrigen = leerMesOrigen(datos.mes_origen, periodo)
    } catch (error) {
        throw new ValidationError(error.message)
    }
    const abierto = await PeriodoRemuneracion.findOne({
        where: { empresa_id: periodo.empresa_id, anio: Number(mesOrigen.slice(0, 4)), mes: Number(mesOrigen.slice(5, 7)), estado: "abierto" }
    })
    if (abierto !== null) {
        throw new ConflictError("El mes de origen sigue abierto: registra esas horas extra en el libro de asistencia de ese mes")
    }
    return mesOrigen
}

async function obtenerConceptoParaVariable(conceptoId, empresaId) {
    const concepto = await ConceptoRemuneracion.findByPk(conceptoId)

    if (concepto === null || (concepto.empresa_id !== null && concepto.empresa_id !== empresaId)) {
        throw new NotFoundError("Concepto no encontrado")
    }

    if (concepto.activo === false) {
        throw new ConflictError("El concepto está inactivo")
    }

    // Excepción: el saldo de pago en exceso de una relación anterior se descuenta a mano, con la autorización firmada.
    const { CODIGO_DESCUENTO } = require("./saldo_relaciones.service.js")
    if (concepto.calculado_por_sistema && concepto.recargo_hora_extra === null && concepto.codigo !== CODIGO_DESCUENTO) {
        throw new ValidationError("Ese concepto lo calcula el sistema y no se ingresa como variable")
    }

    return concepto
}

function valorDeVariable(concepto, datos) {
    if (concepto.recargo_hora_extra !== null) {
        const cantidad = Number(datos.cantidad)

        if (datos.cantidad === undefined || !Number.isFinite(cantidad) || cantidad <= 0) {
            throw new ValidationError("Las horas extra deben ser un número mayor a 0")
        }

        return { cantidad: Math.round(cantidad * 100) / 100, monto: null }
    }

    const monto = Number(datos.monto)

    if (datos.monto === undefined || !Number.isInteger(monto) || monto <= 0) {
        throw new ValidationError("El monto debe ser un número entero mayor a 0")
    }

    return { cantidad: null, monto }
}

// «Descuento por pago en exceso» ingresado a mano: solo hasta el saldo pendiente de relaciones anteriores de la persona.
async function exigirSaldoDeRelacionAnterior(concepto, trabajador, monto, excluirVariableId = null) {
    const { CODIGO_DESCUENTO, saldosDePersona } = require("./saldo_relaciones.service.js")
    if (concepto.codigo !== CODIGO_DESCUENTO) {
        return
    }
    const { pendiente } = await saldosDePersona(trabajador.persona_id, trabajador.empresa_id, { excluirVariableId })
    if (pendiente <= 0) {
        throw new ConflictError("La persona no tiene saldo de pago en exceso pendiente de una relación anterior; el saldo de esta relación lo descuenta el sistema solo")
    }
    if (monto > pendiente) {
        throw new ConflictError(`El monto supera el saldo pendiente de relaciones anteriores ($${pendiente.toLocaleString("es-CL")})`)
    }
}

function glosaDeVariable(glosa) {
    if (glosa === undefined || glosa === null || String(glosa).trim() === "") {
        return null
    }

    const texto = String(glosa).trim()

    if (texto.length > 255) {
        throw new ValidationError("La glosa no puede superar los 255 caracteres")
    }

    return texto
}

async function crearVariable(datos, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(datos.periodo_id, empresasPermitidas)

    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.REGISTRAR_VARIABLES)

    if (periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }

    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || trabajador.empresa_id !== periodo.empresa_id) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    const concepto = await obtenerConceptoParaVariable(datos.concepto_id, periodo.empresa_id)
    const { cantidad, monto } = valorDeVariable(concepto, datos)
    const mesOrigen = await mesOrigenDeVariable(concepto, datos, periodo)
    await exigirSaldoDeRelacionAnterior(concepto, trabajador, monto)

    return await VariablePeriodo.create({
        periodo_id: periodo.id,
        trabajador_id: trabajador.id,
        concepto_id: concepto.id,
        cantidad,
        monto,
        mes_origen: mesOrigen,
        glosa: glosaDeVariable(datos.glosa),
        estado: "pendiente",
        fuente: "manual",
        usuario_registro_id: usuarioId
    })
}

async function listarVariables(periodoId, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)
    // Variables permanentes y cuotas de préstamos del mes (si el periodo está abierto).
    const { materializarPeriodo } = require("./variable_recurrente.service.js")
    await materializarPeriodo(periodo)

    return await VariablePeriodo.findAll({
        where: { periodo_id: periodo.id },
        include: [{ model: ConceptoRemuneracion, attributes: ["codigo", "nombre", "tipo"] }],
        order: [["trabajador_id", "ASC"], ["id", "ASC"]]
    })
}

async function obtenerVariable(id, empresasPermitidas, usuarioId, permiso) {
    const variable = await VariablePeriodo.findByPk(id, { include: [PeriodoRemuneracion] })

    if (variable === null || !empresasPermitidas.includes(variable.PeriodoRemuneracion.empresa_id)) {
        throw new NotFoundError("Variable no encontrada")
    }

    await exigirRol(usuarioId, variable.PeriodoRemuneracion.empresa_id, permiso)

    if (variable.PeriodoRemuneracion.estado !== "abierto") {
        throw new ConflictError("El periodo de remuneraciones está cerrado")
    }

    // La que agrega una variable permanente o un préstamo en cuotas se cambia allí (Variables → Permanentes y préstamos).
    if (variable.recurrente_id !== null && variable.recurrente_id !== undefined) {
        throw new ConflictError("Esta variable viene de una variable permanente o de un préstamo en cuotas: se cambia, se termina o se borra en «Permanentes y préstamos en cuotas»")
    }

    return variable
}

async function editarVariable(id, datos, empresasPermitidas, usuarioId) {
    const variable = await obtenerVariable(id, empresasPermitidas, usuarioId, PERMISOS.REGISTRAR_VARIABLES)

    if (variable.estado !== "pendiente") {
        throw new ConflictError("Solo se puede modificar una variable pendiente")
    }

    const concepto = await ConceptoRemuneracion.findByPk(variable.concepto_id)
    const { cantidad, monto } = valorDeVariable(concepto, datos)
    await exigirSaldoDeRelacionAnterior(concepto, await Trabajador.findByPk(variable.trabajador_id), monto, variable.id)
    // Las propuestas del libro (fuente asistencia) son del mes: se editan sin mes de origen. Las manuales lo exigen.
    const mesOrigen = variable.fuente === "asistencia"
        ? null
        : await mesOrigenDeVariable(concepto, { mes_origen: datos.mes_origen !== undefined ? datos.mes_origen : variable.mes_origen }, variable.PeriodoRemuneracion)

    return await variable.update({
        cantidad,
        monto,
        mes_origen: mesOrigen,
        glosa: datos.glosa !== undefined ? glosaDeVariable(datos.glosa) : variable.glosa
    })
}

// Una variable pendiente la elimina quien registra variables; una aprobada, quien aprueba (ADMIN o JEFE_RRHH), con el
// periodo abierto. Si la liquidación ya estaba calculada, emitirla exige recalcular (validarEmision detecta el cambio).
async function eliminarVariable(id, empresasPermitidas, usuarioId) {
    const variable = await VariablePeriodo.findByPk(id)
    const permiso = variable?.estado === "aprobada" ? PERMISOS.APROBAR_VARIABLES : PERMISOS.REGISTRAR_VARIABLES
    const encontrada = await obtenerVariable(id, empresasPermitidas, usuarioId, permiso)

    await encontrada.destroy()
}

async function aprobarVariable(id, empresasPermitidas, usuarioId) {
    const variable = await obtenerVariable(id, empresasPermitidas, usuarioId, PERMISOS.APROBAR_VARIABLES)

    if (variable.estado === "aprobada") {
        throw new ConflictError("La variable ya está aprobada")
    }

    return await variable.update({
        estado: "aprobada",
        aprobado_por_id: usuarioId,
        fecha_aprobacion: new Date()
    })
}

async function devolverVariable(id, empresasPermitidas, usuarioId) {
    const variable = await obtenerVariable(id, empresasPermitidas, usuarioId, PERMISOS.APROBAR_VARIABLES)

    if (variable.estado === "pendiente") {
        throw new ConflictError("La variable ya está pendiente")
    }

    return await variable.update({
        estado: "pendiente",
        aprobado_por_id: null,
        fecha_aprobacion: null
    })
}

module.exports = {
    crearVariable,
    listarVariables,
    editarVariable,
    eliminarVariable,
    aprobarVariable,
    devolverVariable
}