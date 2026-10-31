const { VariablePeriodo, Trabajador, ConceptoRemuneracion, PeriodoRemuneracion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")

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
    await exigirSaldoDeRelacionAnterior(concepto, trabajador, monto)

    return await VariablePeriodo.create({
        periodo_id: periodo.id,
        trabajador_id: trabajador.id,
        concepto_id: concepto.id,
        cantidad,
        monto,
        glosa: glosaDeVariable(datos.glosa),
        estado: "pendiente",
        fuente: "manual",
        usuario_registro_id: usuarioId
    })
}

async function listarVariables(periodoId, empresasPermitidas) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)

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

    return await variable.update({
        cantidad,
        monto,
        glosa: datos.glosa !== undefined ? glosaDeVariable(datos.glosa) : variable.glosa
    })
}

async function eliminarVariable(id, empresasPermitidas, usuarioId) {
    const variable = await obtenerVariable(id, empresasPermitidas, usuarioId, PERMISOS.REGISTRAR_VARIABLES)

    if (variable.estado !== "pendiente") {
        throw new ConflictError("Solo se puede eliminar una variable pendiente")
    }

    await variable.destroy()
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