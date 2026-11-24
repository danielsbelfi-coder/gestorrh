// Turnos de conducción y tipos de espera (art. 25, paquete V). Ver calculo_turnos.js y «Paquete V» en el SPEC.
const { Op } = require("sequelize")
const { Trabajador, Persona, ContratoTrabajo, Jornada, PeriodoRemuneracion, TipoEspera, TurnoConduccion } = require("../shared/associations.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { esFechaValida } = require("../shared/fechas.js")
const { libroDelTrabajador, rangoDelMes } = require("./libro_asistencia.service.js")
const { calcularTurno, resumenTurnos, topeDelMes, minutosDe } = require("./calculo_turnos.js")

const CLASES = ["terminal", "cruce", "aduana", "mantencion", "retraso_operativo", "descanso_bordo", "descanso_tierra", "otro"]
const PAGOS = ["no", "por_hora", "monto_fijo"]
const REDONDEOS = [1, 15, 30, 60]
const COMPENSACIONES = ["dinero", "descanso"]

// Configuración inicial: lo que el art. 25 deja fuera de la jornada (esperas entre turnos sin labor y descansos) no
// se imputa y no se paga hasta que la empresa indique su acuerdo; lo que ocurre dentro del servicio o por instrucción
// de la empresa queda como tiempo a disposición (jornada).
const TIPOS_INICIALES = [
    { nombre: "Espera en terminal entre servicios", clase: "terminal", imputable: false },
    { nombre: "Descanso a bordo", clase: "descanso_bordo", imputable: false },
    { nombre: "Descanso en tierra", clase: "descanso_tierra", imputable: false },
    { nombre: "Espera dentro del servicio (a disposición)", clase: "otro", imputable: true },
    { nombre: "Cruce o aduana", clase: "aduana", imputable: true },
    { nombre: "Mantención o retraso operativo", clase: "mantencion", imputable: true }
]

// ---------- Tipos de espera ----------

async function listarTiposEspera(empresaId, empresasPermitidas) {
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    let tipos = await TipoEspera.findAll({ where: { empresa_id: empresaId }, order: [["id", "ASC"]] })
    if (tipos.length === 0) {
        await TipoEspera.bulkCreate(TIPOS_INICIALES.map((t) => ({ ...t, empresa_id: empresaId })))
        tipos = await TipoEspera.findAll({ where: { empresa_id: empresaId }, order: [["id", "ASC"]] })
    }
    return tipos
}

function validarTipo(datos, actual = {}) {
    const t = { ...actual, ...datos }
    const nombre = String(t.nombre ?? "").trim()
    if (nombre === "" || nombre.length > 80) {
        throw new ValidationError("El nombre del tipo de espera es obligatorio (hasta 80 caracteres)")
    }
    if (!CLASES.includes(t.clase)) {
        throw new ValidationError(`La clase debe ser una de: ${CLASES.join(", ")}`)
    }
    const imputable = t.imputable === true || t.imputable === "true"
    const pago = imputable ? "no" : (t.pago ?? "no")
    if (!PAGOS.includes(pago)) {
        throw new ValidationError("El pago debe ser: no, por hora o monto fijo")
    }
    const numero = (valor, nombreCampo) => {
        const n = Number(valor ?? 0)
        if (!Number.isInteger(n) || n < 0) {
            throw new ValidationError(`${nombreCampo} debe ser un número entero mayor o igual a 0`)
        }
        return n
    }
    const valor = numero(t.valor, "El valor")
    const minutosSinPago = numero(t.minutos_sin_pago, "Los minutos sin pago")
    const redondeo = Number(t.redondeo_minutos ?? 1)
    if (!REDONDEOS.includes(redondeo)) {
        throw new ValidationError("El redondeo debe ser de 1, 15, 30 o 60 minutos")
    }
    const compensacion = t.compensacion ?? "dinero"
    if (!COMPENSACIONES.includes(compensacion)) {
        throw new ValidationError("La compensación debe ser en dinero o en descanso")
    }
    if (!imputable && compensacion === "dinero" && pago !== "no" && valor === 0) {
        throw new ValidationError("Indica el valor que se paga por la espera")
    }
    return { nombre, clase: t.clase, imputable, pago, valor: imputable ? 0 : valor, minutos_sin_pago: imputable ? 0 : minutosSinPago, redondeo_minutos: redondeo, compensacion: imputable ? "dinero" : compensacion }
}

// tipo: el tipo existente (actualizar) o null (crear, con campos.empresa_id). Ojo: update() sobre una instancia sin
// guardar solo inserta las columnas que recibe, por eso la creación usa create().
async function guardarTipo(tipo, campos) {
    try {
        return tipo === null ? await TipoEspera.create(campos) : await tipo.update(campos)
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            throw new ConflictError("Ya existe un tipo de espera con ese nombre")
        }
        throw error
    }
}

async function crearTipoEspera(datos, empresasPermitidas, usuarioId) {
    const empresaId = Number(datos?.empresa_id)
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    await exigirRol(usuarioId, empresaId, PERMISOS.CONFIGURAR_CONCEPTOS)
    return await guardarTipo(null, { ...validarTipo(datos ?? {}), empresa_id: empresaId })
}

// Los cambios rigen para todos los turnos del mes abierto (los meses cerrados ya quedaron en sus liquidaciones).
async function actualizarTipoEspera(id, datos, empresasPermitidas, usuarioId) {
    const tipo = await TipoEspera.findByPk(id)
    if (tipo === null || !empresasPermitidas.includes(tipo.empresa_id)) {
        throw new NotFoundError("Tipo de espera no encontrado")
    }
    await exigirRol(usuarioId, tipo.empresa_id, PERMISOS.CONFIGURAR_CONCEPTOS)
    const campos = validarTipo(datos ?? {}, tipo.toJSON())
    if (datos?.activo !== undefined) {
        campos.activo = datos.activo === true || datos.activo === "true"
    }
    return await guardarTipo(tipo, campos)
}

// ---------- Turnos ----------

async function exigirPeriodoAbierto(empresaId, fecha) {
    const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: empresaId, anio: Number(fecha.slice(0, 4)), mes: Number(fecha.slice(5, 7)) } })
    if (periodo !== null && periodo.estado !== "abierto") {
        throw new ConflictError("El periodo de esa fecha está cerrado")
    }
}

async function trabajadorPermitido(id, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(id, { include: [Persona] })
    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    return trabajador
}

async function mapaDeTipos(empresaId) {
    const tipos = await TipoEspera.findAll({ where: { empresa_id: empresaId } })
    return new Map(tipos.map((t) => [t.id, t.toJSON()]))
}

// Libro, tope y jornada del art. 25 del trabajador en el mes (null si no tiene jornada del art. 25 en el mes).
async function contextoDelMes(trabajador, anio, mes) {
    const libro = await libroDelTrabajador(trabajador, anio, mes)
    const art25 = (libro.tramos ?? []).filter((t) => t.tipo === "art25")
    if (art25.length === 0) {
        return { libro, jornada: null, topeHoras: 0 }
    }
    const jornada = art25[art25.length - 1]
    // Días del mes cubiertos por el contrato, en días comerciales (como el sueldo): sin descontar ausencias.
    const { calcularDiasPago } = require("../remuneraciones/dias_pago.js")
    const { diasPagados } = calcularDiasPago({
        anio, mes, fechaIngreso: trabajador.fecha_ingreso, fechaTermino: trabajador.fecha_termino ?? null,
        resumen: { dias_inasistencia: 0, dias_licencia_medica: 0, dias_permiso_sin_goce: 0 }
    })
    return { libro, jornada, topeHoras: topeDelMes(jornada.horas_mensuales ?? 180, diasPagados) }
}

function datosDelTurno(entrada) {
    const datos = {
        fecha: String(entrada?.fecha ?? "").slice(0, 10),
        hora_inicio: String(entrada?.hora_inicio ?? "").slice(0, 5),
        hora_fin: String(entrada?.hora_fin ?? "").slice(0, 5),
        servicio: String(entrada?.servicio ?? "").trim().slice(0, 120) || null,
        observaciones: String(entrada?.observaciones ?? "").trim().slice(0, 300) || null,
        pausas: (Array.isArray(entrada?.pausas) ? entrada.pausas : []).map((p) => ({
            tipo_espera_id: Number(p.tipo_espera_id),
            inicio: String(p.inicio ?? "").slice(0, 5),
            fin: String(p.fin ?? "").slice(0, 5),
            lugar: String(p.lugar ?? "").trim().slice(0, 120) || null,
            causa: String(p.causa ?? "").trim().slice(0, 200) || null
        }))
    }
    if (!esFechaValida(datos.fecha)) {
        throw new ValidationError("Indica la fecha en que empieza el turno")
    }
    if (minutosDe(datos.hora_inicio) === null || minutosDe(datos.hora_fin) === null) {
        throw new ValidationError("Indica la hora de inicio y de fin del turno (HH:MM)")
    }
    return datos
}

// Valida el turno contra el libro del día, los tipos de la empresa y los demás turnos del mes (superposición).
async function validarTurno(trabajador, datos, idActual = null) {
    await exigirPeriodoAbierto(trabajador.empresa_id, datos.fecha)
    const anio = Number(datos.fecha.slice(0, 4))
    const mes = Number(datos.fecha.slice(5, 7))
    const { libro, jornada } = await contextoDelMes(trabajador, anio, mes)
    const esperado = libro.dias.find((d) => d.fecha === datos.fecha)?.esperado
    if (!esperado || esperado.tipo === "fuera_contrato") {
        throw new ConflictError("Esa fecha está fuera del contrato del trabajador")
    }
    if (esperado.tipo === "licencia") {
        throw new ConflictError("Ese día el trabajador tiene licencia médica")
    }
    if (jornada === null || (esperado.tipo !== "turnos" && esperado.tipo !== "feriado")) {
        throw new ConflictError("El contrato no tiene jornada del art. 25 ese día: los turnos de conducción son para choferes y auxiliares interurbanos")
    }
    const marca = libro.dias.find((d) => d.fecha === datos.fecha)?.marca
    if (marca && ["inasistencia", "vacaciones", "permiso_sin_goce", "permiso_con_goce"].includes(marca.tipo) && marca.estado_aprobacion !== "rechazada") {
        throw new ConflictError(`Ese día tiene registrado ${marca.tipo.replaceAll("_", " ")} en el libro de asistencia`)
    }

    const tipos = await mapaDeTipos(trabajador.empresa_id)
    for (const p of datos.pausas) {
        const tipo = tipos.get(p.tipo_espera_id)
        if (tipo && !tipo.activo) {
            throw new ValidationError(`El tipo de espera «${tipo.nombre}» está desactivado`)
        }
    }
    const calculo = calcularTurno(datos, tipos)
    if (calculo.errores.length > 0) {
        throw new ValidationError(calculo.errores.join(". "))
    }

    // Superposición con los turnos vecinos (del día anterior al siguiente).
    const vecinos = await TurnoConduccion.findAll({
        where: { trabajador_id: trabajador.id, fecha: { [Op.between]: [sumarDias(datos.fecha, -1), sumarDias(datos.fecha, 1)] }, ...(idActual ? { id: { [Op.ne]: idActual } } : {}) }
    })
    const { filas } = resumenTurnos({ turnos: [...vecinos.map((v) => v.toJSON()), { ...datos, id: 0, estado_aprobacion: "pendiente" }], tipos, topeHoras: 0 })
    const propia = filas.find((f) => f.turno.id === 0)
    if (propia.calculo.errores.length > 0) {
        throw new ConflictError(propia.calculo.errores.join(". "))
    }
    const siguiente = filas[filas.indexOf(propia) + 1]
    if (siguiente && siguiente.calculo.errores.some((e) => e.includes("Se superpone"))) {
        throw new ConflictError("Se superpone con el turno siguiente")
    }
    return calculo
}

function sumarDias(fecha, dias) {
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    return d.toISOString().slice(0, 10)
}

async function crearTurno(entrada, empresasPermitidas, usuarioId) {
    const trabajador = await trabajadorPermitido(Number(entrada?.trabajador_id), empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)
    const datos = datosDelTurno(entrada)
    const calculo = await validarTurno(trabajador, datos)
    const turno = await TurnoConduccion.create({ ...datos, trabajador_id: trabajador.id, fuente: "manual", estado_aprobacion: "pendiente", usuario_registro_id: usuarioId })
    return { turno, alertas: calculo.alertas }
}

const MAXIMO_DIAS_LOTE = 31

// Registra el mismo turno (horario, servicio y pausas) en las fechas elegidas de un rango: las marcadas en el
// calendario (`fechas`) o las de ciertos días de la semana (`dias_semana`, 1 = lunes … 7 = domingo). Cada fecha se valida como un turno suelto: las que no se pueden registrar (inasistencia,
// licencia, superposición, fuera del contrato, periodo cerrado) se omiten con su motivo y las demás se crean.
async function crearTurnosEnLote(entrada, empresasPermitidas, usuarioId) {
    const trabajador = await trabajadorPermitido(Number(entrada?.trabajador_id), empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)
    const desde = String(entrada?.desde ?? "").slice(0, 10)
    const hasta = String(entrada?.hasta ?? "").slice(0, 10)
    if (!esFechaValida(desde) || !esFechaValida(hasta) || hasta < desde) {
        throw new ValidationError("Indica las fechas desde y hasta (hasta igual o posterior a desde)")
    }
    const largo = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1
    if (largo > MAXIMO_DIAS_LOTE) {
        throw new ValidationError(`El rango puede tener hasta ${MAXIMO_DIAS_LOTE} días`)
    }
    // Las fechas se eligen en el calendario (paquete Z, `fechas`) o, como antes, por días de la semana (`dias_semana`).
    let elegidas
    if (Array.isArray(entrada?.fechas)) {
        elegidas = [...new Set(entrada.fechas.map((f) => String(f).slice(0, 10)))].sort()
        if (elegidas.length === 0) {
            throw new ValidationError("Elige al menos una fecha en el calendario")
        }
        if (elegidas.some((f) => !esFechaValida(f) || f < desde || f > hasta)) {
            throw new ValidationError("Las fechas elegidas deben estar entre desde y hasta")
        }
    } else {
        const dias = (Array.isArray(entrada?.dias_semana) ? entrada.dias_semana : [1, 2, 3, 4, 5, 6, 7]).map(Number)
        if (dias.length === 0 || dias.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
            throw new ValidationError("Elige al menos un día de la semana")
        }
        elegidas = Array.from({ length: largo }, (_, i) => sumarDias(desde, i))
            .filter((fecha) => dias.includes(((new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7) + 1))
    }
    // Revisa el horario y las pausas una vez, con la primera fecha, antes de recorrer el rango: un error del turno
    // (pausa fuera del horario, tipo inexistente) se informa una sola vez y no se registra nada.
    const plantilla = calcularTurno(datosDelTurno({ ...entrada, fecha: desde }), await mapaDeTipos(trabajador.empresa_id))
    if (plantilla.errores.length > 0) {
        throw new ValidationError(plantilla.errores.join(". "))
    }

    const creados = []
    const omitidos = []
    for (const fecha of elegidas) {
        try {
            const datos = datosDelTurno({ ...entrada, fecha })
            const calculo = await validarTurno(trabajador, datos)
            const turno = await TurnoConduccion.create({ ...datos, trabajador_id: trabajador.id, fuente: "manual", estado_aprobacion: "pendiente", usuario_registro_id: usuarioId })
            creados.push({ id: turno.id, fecha, alertas: calculo.alertas })
        } catch (error) {
            if (!(error instanceof ValidationError || error instanceof ConflictError)) {
                throw error
            }
            omitidos.push({ fecha, motivo: error.message })
        }
    }
    return { creados, omitidos }
}

async function turnoPermitido(id, empresasPermitidas) {
    const turno = await TurnoConduccion.findByPk(id, { include: [Trabajador] })
    if (turno === null || !empresasPermitidas.includes(turno.Trabajador.empresa_id)) {
        throw new NotFoundError("Turno no encontrado")
    }
    return turno
}

// Editar un turno lo deja pendiente otra vez.
async function actualizarTurno(id, entrada, empresasPermitidas, usuarioId) {
    const turno = await turnoPermitido(id, empresasPermitidas)
    await exigirRol(usuarioId, turno.Trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)
    await exigirPeriodoAbierto(turno.Trabajador.empresa_id, turno.fecha)
    const datos = datosDelTurno({ ...turno.toJSON(), ...entrada })
    const calculo = await validarTurno(turno.Trabajador, datos, turno.id)
    await turno.update({ ...datos, estado_aprobacion: "pendiente", aprobado_por_id: null })
    return { turno, alertas: calculo.alertas }
}

async function eliminarTurno(id, empresasPermitidas, usuarioId) {
    const turno = await turnoPermitido(id, empresasPermitidas)
    await exigirRol(usuarioId, turno.Trabajador.empresa_id, PERMISOS.REGISTRAR_ASISTENCIA)
    await exigirPeriodoAbierto(turno.Trabajador.empresa_id, turno.fecha)
    await turno.destroy()
}

async function aprobarTurno(id, empresasPermitidas, usuarioId) {
    const turno = await turnoPermitido(id, empresasPermitidas)
    await exigirRol(usuarioId, turno.Trabajador.empresa_id, PERMISOS.APROBAR_ASISTENCIA)
    await exigirPeriodoAbierto(turno.Trabajador.empresa_id, turno.fecha)
    return await turno.update({ estado_aprobacion: "aprobado", aprobado_por_id: usuarioId })
}

// Aprueba los turnos pendientes del mes que no tienen errores.
async function aprobarMes({ trabajador_id, anio, mes }, empresasPermitidas, usuarioId) {
    const trabajador = await trabajadorPermitido(Number(trabajador_id), empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_ASISTENCIA)
    const { primerDia, ultimoDia } = rangoDelMes(Number(anio), Number(mes))
    await exigirPeriodoAbierto(trabajador.empresa_id, primerDia)
    const { filas } = await calcularMes(trabajador, Number(anio), Number(mes))
    const ids = filas.filter((f) => f.turno.estado_aprobacion === "pendiente" && f.calculo.errores.length === 0).map((f) => f.turno.id)
    if (ids.length > 0) {
        await TurnoConduccion.update({ estado_aprobacion: "aprobado", aprobado_por_id: usuarioId }, { where: { id: ids, fecha: { [Op.between]: [primerDia, ultimoDia] } } })
    }
    return { aprobados: ids.length }
}

async function calcularMes(trabajador, anio, mes) {
    const { primerDia, ultimoDia } = rangoDelMes(anio, mes)
    const { jornada, topeHoras } = await contextoDelMes(trabajador, anio, mes)
    const tipos = await mapaDeTipos(trabajador.empresa_id)
    const turnos = await TurnoConduccion.findAll({ where: { trabajador_id: trabajador.id, fecha: { [Op.between]: [primerDia, ultimoDia] } } })
    const anterior = await TurnoConduccion.findOne({ where: { trabajador_id: trabajador.id, fecha: { [Op.lt]: primerDia } }, order: [["fecha", "DESC"], ["hora_inicio", "DESC"]] })
    const calculo = resumenTurnos({ turnos: turnos.map((t) => t.toJSON()), tipos, topeHoras, anterior: anterior ? anterior.toJSON() : null })
    return { ...calculo, jornada, topeHoras, tipos: [...tipos.values()] }
}

// Turnos del mes de un trabajador con su cálculo y el resumen (para la pantalla y, en el paquete W, la liquidación).
async function turnosDelMes({ trabajador_id, anio, mes }, empresasPermitidas) {
    const trabajador = await trabajadorPermitido(Number(trabajador_id), empresasPermitidas)
    const a = Number(anio)
    const m = Number(mes)
    if (!Number.isInteger(a) || !Number.isInteger(m) || m < 1 || m > 12) {
        throw new ValidationError("Indica el año y el mes")
    }
    const { filas, resumen, jornada, topeHoras, tipos } = await calcularMes(trabajador, a, m)
    return {
        trabajador: { id: trabajador.id, nombre: `${trabajador.Persona.nombres} ${trabajador.Persona.apellido_paterno} ${trabajador.Persona.apellido_materno ?? ""}`.trim() },
        jornada: jornada ? { nombre: jornada.nombre, horas_mensuales: jornada.horas_mensuales } : null,
        topeHoras,
        tipos,
        turnos: filas.map(({ turno, calculo }) => ({ ...turno, calculo })),
        resumen
    }
}

// Trabajadores de la empresa con jornada del art. 25 en el mes (para el selector de la pantalla).
async function trabajadoresConTurnos({ empresa_id, anio, mes }, empresasPermitidas) {
    const empresaId = Number(empresa_id)
    if (!empresasPermitidas.includes(empresaId)) {
        throw new NotFoundError("Empresa no encontrada")
    }
    const { primerDia, ultimoDia } = rangoDelMes(Number(anio), Number(mes))
    const contratos = await ContratoTrabajo.findAll({
        where: {
            estado: { [Op.ne]: "anulado" },
            fecha_inicio: { [Op.lte]: ultimoDia },
            [Op.or]: [{ fecha_termino: null }, { fecha_termino: { [Op.gte]: primerDia } }, { tipo_contrato: "indefinido" }]
        },
        include: [
            { model: Jornada, where: { tipo: "art25" }, required: true },
            { model: Trabajador, where: { empresa_id: empresaId }, required: true, include: [Persona] }
        ]
    })
    const vistos = new Map()
    for (const c of contratos) {
        const p = c.Trabajador.Persona
        vistos.set(c.Trabajador.id, { id: c.Trabajador.id, nombre: `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno ?? ""}`.trim(), rut: `${p.rut}-${p.dv}` })
    }
    return [...vistos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
}

// Lo que los turnos aportan a las remuneraciones del mes (paquete W): solo turnos aprobados y sin errores.
// Devuelve null si el trabajador no tiene jornada del art. 25 en el mes.
// { horasSobreTope, minutosJornada, topeHoras, montoEsperas, minutosPagables, fechasTrabajadas (Set de AAAA-MM-DD),
//   pendientes, conErrores, horasMensuales, huella }
async function datosParaRemuneraciones(trabajador, anio, mes) {
    const { filas, resumen, jornada, topeHoras } = await calcularMes(trabajador, anio, mes)
    if (jornada === null) {
        return null
    }
    const validas = filas.filter((f) => f.turno.estado_aprobacion === "aprobado" && f.calculo.errores.length === 0)
    const huella = filas.map((f) => [f.turno.id, f.turno.fecha, f.turno.hora_inicio, f.turno.hora_fin, f.turno.estado_aprobacion, JSON.stringify(f.turno.pausas ?? [])].join("|")).join(";")
    return {
        horasSobreTope: Math.round(resumen.minutosSobreTope / 60 * 100) / 100,
        minutosJornada: resumen.minutosJornada,
        topeHoras,
        montoEsperas: resumen.montoEsperas,
        minutosPagables: resumen.esperas.reduce((s, e) => s + e.pagables, 0),
        fechasTrabajadas: new Set(validas.map((f) => String(f.turno.fecha).slice(0, 10))),
        pendientes: resumen.pendientes,
        conErrores: resumen.conErrores,
        horasMensuales: Number(jornada.horas_mensuales ?? 180),
        huella
    }
}

module.exports = {
    datosParaRemuneraciones,
    listarTiposEspera,
    crearTipoEspera,
    actualizarTipoEspera,
    crearTurno,
    crearTurnosEnLote,
    actualizarTurno,
    eliminarTurno,
    aprobarTurno,
    aprobarMes,
    turnosDelMes,
    trabajadoresConTurnos,
    calcularMes
}
