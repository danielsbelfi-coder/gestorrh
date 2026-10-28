const { Asistencia, AsistenciaCorreccion, Trabajador, PeriodoRemuneracion } = require("../shared/associations.js")
const { esFechaValida } = require("../shared/fechas.js")
const { libroDelTrabajador } = require("./libro_asistencia.service.js")
const { calcularDiaLaboral } = require("./libro_asistencia.js")

// Tipos que se registran en el libro. licencia_medica no: las licencias se cargan en su propio módulo.
const TIPOS_LIBRO = ["normal", "atraso", "inasistencia", "permiso_con_goce", "permiso_sin_goce", "vacaciones"]
const TIPOS_CON_HORA = ["normal", "atraso"]
const CAMPOS_MARCA = ["fecha", "hora_entrada", "hora_salida", "tipo", "observaciones"]

function normalizarHora(hora, nombre) {
    if (hora === undefined || hora === null || hora === "") {
        return null
    }
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)(:00)?$/.exec(String(hora))
    if (!coincidencia) {
        throw new ValidationError(`La hora de ${nombre} debe tener el formato HH:MM`)
    }
    return `${coincidencia[1]}:${coincidencia[2]}`
}

async function exigirPeriodoAbierto(empresaId, fecha) {
    const periodo = await PeriodoRemuneracion.findOne({
        where: { empresa_id: empresaId, anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) }
    })
    if (periodo !== null && periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de esa fecha está cerrado")
    }
}

// Valida una marca contra lo esperado ese día según el libro (jornada, feriados, licencias, contrato).
// Devuelve los datos normalizados.
async function validarMarca(trabajador, entrada) {
    const datos = {
        fecha: entrada.fecha,
        tipo: entrada.tipo,
        hora_entrada: normalizarHora(entrada.hora_entrada, "entrada"),
        hora_salida: normalizarHora(entrada.hora_salida, "salida"),
        observaciones: typeof entrada.observaciones === "string" && entrada.observaciones.trim() !== "" ? entrada.observaciones.trim() : null
    }

    if (!esFechaValida(datos.fecha)) {
        throw new ValidationError("La fecha debe ser válida (AAAA-MM-DD)")
    }
    if (!TIPOS_LIBRO.includes(datos.tipo)) {
        throw new ValidationError("Tipo de marca no válido (las licencias médicas se registran en su módulo)")
    }

    if (TIPOS_CON_HORA.includes(datos.tipo)) {
        if (datos.hora_entrada === null && datos.hora_salida === null) {
            throw new ValidationError("Indica la hora real de entrada, de salida o ambas (la que quede vacía se entiende según horario)")
        }
    } else {
        datos.hora_entrada = null
        datos.hora_salida = null
    }

    await exigirPeriodoAbierto(trabajador.empresa_id, datos.fecha)

    const libro = await libroDelTrabajador(trabajador, Number(datos.fecha.slice(0, 4)), Number(datos.fecha.slice(5, 7)))
    const esperado = libro.dias.find((d) => d.fecha === datos.fecha).esperado

    if (esperado.tipo === "fuera_contrato") {
        throw new ConflictError("Esa fecha está fuera del contrato del trabajador")
    }
    if (esperado.tipo === "licencia") {
        throw new ConflictError("Ese día el trabajador tiene licencia médica")
    }

    const diaNoLaboral = esperado.tipo === "libre" || esperado.tipo === "feriado"
    if (diaNoLaboral && !TIPOS_CON_HORA.includes(datos.tipo)) {
        throw new ConflictError(`Ese día es ${esperado.tipo === "feriado" ? `feriado (${esperado.nombre})` : "libre según su jornada"}: no corresponde registrar ${datos.tipo.replaceAll("_", " ")}`)
    }
    if (diaNoLaboral && (datos.hora_entrada === null || datos.hora_salida === null)) {
        throw new ValidationError("Trabajo en día libre o feriado: indica la hora de entrada y de salida")
    }
    if (TIPOS_CON_HORA.includes(datos.tipo) && datos.hora_entrada !== null && datos.hora_salida !== null && datos.hora_salida <= datos.hora_entrada) {
        throw new ValidationError("La salida debe ser posterior a la entrada")
    }
    if (esperado.tipo === "laboral" && TIPOS_CON_HORA.includes(datos.tipo) && calcularDiaLaboral(esperado, datos).error) {
        throw new ValidationError(calcularDiaLaboral(esperado, datos).error)
    }

    return datos
}
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { Op } = require("sequelize")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")

async function crearAsistencia(datos, empresasPermitidas, usuarioId) {
    const trabajador = await Trabajador.findByPk(datos.trabajador_id)

    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)

    const asistenciaExistente = await Asistencia.findOne({
        where: {
            trabajador_id: datos.trabajador_id,
            fecha: datos.fecha,
        }

    })
    if (asistenciaExistente !== null) {
        throw new ConflictError("Ya existe un registro de asistencia para ese trabajador en esa fecha")
    }

    Object.assign(datos, await validarMarca(trabajador, datos))

    return await Asistencia.create(datos, {
        fields: [
            "trabajador_id",
            "fecha",
            "hora_entrada",
            "hora_salida",
            "tipo",
            "fuente",
            "observaciones",
            "usuario_registro_id"
        ]
    })
}

async function listarAsistencias(empresasPermitidas) {
    return await Asistencia.findAll({
        include: [{
            model: Trabajador,
            where: {
                empresa_id: { [Op.in]: empresasPermitidas }
            },
            required: true
        }]
    })
}

async function obtenerAsistenciaPorId(id, empresasPermitidas) {
    const asistencia = await Asistencia.findByPk(id, {
        include: [Trabajador]
    })

    if (asistencia === null || !empresasPermitidas.includes(asistencia.Trabajador.empresa_id)) {
        throw new NotFoundError("Asistencia no encontrada")
    }

    return asistencia
}

const ESTADOS_APROBACION = ["pendiente", "aprobada", "rechazada"]

async function cambiarAprobacionAsistencia(id, estado, empresasPermitidas, usuarioId) {
    const asistencia = await obtenerAsistenciaPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, asistencia.Trabajador.empresa_id, PERMISOS.APROBAR_ASISTENCIA)

    if (!ESTADOS_APROBACION.includes(estado)) {
        throw new ValidationError("El estado debe ser pendiente, aprobada o rechazada")
    }
    if (asistencia.estado_aprobacion === estado) {
        throw new ConflictError(`La marca ya está ${estado}`)
    }

    // Una marca de un mes ya cerrado no se toca: ese mes ya se liquidó.
    const periodo = await PeriodoRemuneracion.findOne({
        where: {
            empresa_id: asistencia.Trabajador.empresa_id,
            anio: Number(asistencia.fecha.slice(0, 4)),
            mes: Number(asistencia.fecha.slice(5, 7))
        }
    })
    if (periodo !== null && periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de esa fecha está cerrado")
    }

    return await asistencia.update({
        estado_aprobacion: estado,
        aprobado_por_id: estado === "pendiente" ? null : usuarioId,
        fecha_aprobacion: estado === "pendiente" ? null : new Date()
    })
}

async function marcaEditable(id, empresasPermitidas, usuarioId) {
    const asistencia = await obtenerAsistenciaPorId(id, empresasPermitidas)

    await exigirRol(usuarioId, asistencia.Trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)

    if (asistencia.estado_aprobacion === "aprobada") {
        throw new ConflictError("La marca está aprobada: la jefatura debe devolverla a pendiente para modificarla")
    }

    await exigirPeriodoAbierto(asistencia.Trabajador.empresa_id, asistencia.fecha)
    return asistencia
}

// Editar una marca pendiente o rechazada. Queda pendiente de aprobación otra vez.
async function editarAsistencia(id, entrada, empresasPermitidas, usuarioId) {
    const asistencia = await marcaEditable(id, empresasPermitidas, usuarioId)

    const finales = { ...asistencia.toJSON(), ...entrada }
    if (finales.fecha !== asistencia.fecha) {
        throw new ValidationError("La fecha de una marca no se cambia: elimínala y registra una nueva")
    }

    const datos = await validarMarca(asistencia.Trabajador, finales)

    return await asistencia.update({
        ...datos,
        estado_aprobacion: "pendiente",
        aprobado_por_id: null,
        fecha_aprobacion: null,
        usuario_registro_id: usuarioId
    }, { fields: [...CAMPOS_MARCA, "estado_aprobacion", "aprobado_por_id", "fecha_aprobacion", "usuario_registro_id"] })
}

// Eliminar una marca pendiente o rechazada (el día vuelve a "según horario").
async function eliminarAsistencia(id, empresasPermitidas, usuarioId) {
    const asistencia = await marcaEditable(id, empresasPermitidas, usuarioId)

    const correcciones = await AsistenciaCorreccion.count({ where: { asistencia_id: asistencia.id } })
    if (correcciones > 0) {
        throw new ConflictError("La marca tiene solicitudes de corrección: no se puede eliminar")
    }

    await asistencia.destroy()
}

// Aprueba todas las marcas pendientes del mes de un trabajador.
async function aprobarMes({ trabajador_id, anio, mes }, empresasPermitidas, usuarioId) {
    const trabajador = await Trabajador.findByPk(trabajador_id)
    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_ASISTENCIA)

    const año = Number(anio)
    const numeroMes = Number(mes)
    if (!Number.isInteger(año) || !Number.isInteger(numeroMes) || numeroMes < 1 || numeroMes > 12) {
        throw new ValidationError("Indica el año y el mes")
    }
    const mm = String(numeroMes).padStart(2, "0")
    const primerDia = `${año}-${mm}-01`
    const ultimoDia = `${año}-${mm}-${new Date(Date.UTC(año, numeroMes, 0)).getUTCDate()}`

    await exigirPeriodoAbierto(trabajador.empresa_id, primerDia)

    const [aprobadas] = await Asistencia.update(
        { estado_aprobacion: "aprobada", aprobado_por_id: usuarioId, fecha_aprobacion: new Date() },
        { where: { trabajador_id: trabajador.id, estado_aprobacion: "pendiente", fecha: { [Op.between]: [primerDia, ultimoDia] } } }
    )

    return { aprobadas }
}

module.exports = {
    crearAsistencia,
    listarAsistencias,
    obtenerAsistenciaPorId,
    cambiarAprobacionAsistencia,
    editarAsistencia,
    eliminarAsistencia,
    aprobarMes
}
