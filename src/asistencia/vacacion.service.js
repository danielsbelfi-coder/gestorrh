// Vacaciones: solicitudes con aprobación, marcas del libro y saldo por período. Ver «Módulo de vacaciones, parte 1».
const { Op } = require("sequelize")
const { Vacacion, VacacionSaldoInicial, Trabajador, Persona, Asistencia, LicenciaMedica, PeriodoRemuneracion,
    ResumenAsistencia, ContratoTrabajo } = require("../shared/associations.js")
const { Feriado } = require("../calendario/feriado.model.js")
const { feriadosAplicables } = require("../calendario/feriado_calculo.js")
const { sequelize } = require("../shared/database.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ConflictError, ValidationError } = require("../shared/errors.js")
const { esFechaValida, fechaChilena } = require("../shared/fechas.js")
const { fechasHabiles, saldoVacaciones, feriadoFiniquito } = require("./vacaciones.js")
const { libroDelTrabajador } = require("./libro_asistencia.service.js")

const hoyChile = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
const ACTIVAS = ["pendiente", "aprobada"]

async function obtenerTrabajador(trabajadorId, empresasPermitidas) {
    const trabajador = await Trabajador.findByPk(Number(trabajadorId), { include: [Persona] })
    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }
    return trabajador
}

async function obtenerVacacion(id, empresasPermitidas) {
    const vacacion = await Vacacion.findByPk(Number(id), { include: [Trabajador] })
    if (vacacion === null || !empresasPermitidas.includes(vacacion.Trabajador.empresa_id)) {
        throw new NotFoundError("Vacaciones no encontradas")
    }
    return vacacion
}

// Meses "AAAA-MM" entre dos fechas.
function mesesEntre(desde, hasta) {
    const meses = []
    let anio = Number(desde.slice(0, 4))
    let mes = Number(desde.slice(5, 7))
    while (`${anio}-${String(mes).padStart(2, "0")}` <= hasta.slice(0, 7)) {
        meses.push({ anio, mes })
        mes++
        if (mes > 12) {
            mes = 1
            anio++
        }
    }
    return meses
}

async function exigirMesesAbiertos(empresaId, desde, hasta, transaction) {
    for (const { anio, mes } of mesesEntre(desde, hasta)) {
        const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: empresaId, anio, mes }, transaction })
        if (periodo !== null && periodo.estado !== "abierto") {
            throw new ConflictError(`El periodo de ${String(mes).padStart(2, "0")}-${anio} está cerrado`)
        }
    }
}

// Comuna de prestación del contrato vigente al inicio de las vacaciones (para los feriados regionales).
async function comunaDelContrato(trabajadorId, fecha) {
    const contrato = await ContratoTrabajo.findOne({
        where: { trabajador_id: trabajadorId, estado: { [Op.ne]: "anulado" }, fecha_inicio: { [Op.lte]: fecha } },
        order: [["fecha_inicio", "DESC"]]
    })
    return contrato?.comuna_prestacion ?? null
}

async function feriadosEntre(desde, hasta, comuna) {
    const feriados = await Feriado.findAll({ where: { fecha: { [Op.between]: [desde, hasta] } } })
    return feriadosAplicables(feriados.map((f) => f.toJSON()), comuna).map((f) => String(f.fecha).slice(0, 10))
}

// aFecha: fecha a la que se calcula (el finiquito usa la del término aunque sea futura); por defecto, hoy.
async function saldoDe(trabajador, { excluir = null, agregar = null, aFecha = null } = {}) {
    const aprobadas = await Vacacion.findAll({ where: { trabajador_id: trabajador.id, estado: "aprobada" } })
    const inicial = await VacacionSaldoInicial.findOne({ where: { trabajador_id: trabajador.id } })
    const tomadas = aprobadas
        .filter((v) => v.id !== excluir)
        .map((v) => ({ id: v.id, desde: v.desde, dias: v.dias_habiles }))
    if (agregar) {
        tomadas.push(agregar)
    }
    const persona = await Persona.findByPk(trabajador.persona_id, { attributes: ["anios_previos_progresivo"] })
    return saldoVacaciones({
        aniosPrevios: persona?.anios_previos_progresivo ?? 0,
        fechaIngreso: trabajador.fecha_ingreso,
        fechaTermino: trabajador.fecha_termino,
        hoy: aFecha ?? hoyChile(),
        saldoInicial: inicial ? { fecha_corte: inicial.fecha_corte, dias: Number(inicial.dias) } : null,
        tomadas
    })
}

// Valida fechas y cruces; devuelve los días hábiles.
async function validarSolicitud(trabajador, datos, excluirId = null) {
    const { desde, hasta } = datos
    if (!esFechaValida(desde) || !esFechaValida(hasta)) {
        throw new ValidationError("Las fechas deben tener el formato AAAA-MM-DD")
    }
    if (hasta < desde) {
        throw new ValidationError("La fecha de término no puede ser anterior a la de inicio")
    }
    if (!trabajador.fecha_ingreso || desde < trabajador.fecha_ingreso) {
        throw new ValidationError(`Las vacaciones no pueden empezar antes del ingreso (${fechaChilena(trabajador.fecha_ingreso)})`)
    }
    if (trabajador.fecha_termino && hasta > trabajador.fecha_termino) {
        throw new ValidationError(`Las vacaciones no pueden terminar después del término de la relación (${fechaChilena(trabajador.fecha_termino)})`)
    }
    const cruce = await Vacacion.findOne({
        where: { trabajador_id: trabajador.id, estado: ACTIVAS, desde: { [Op.lte]: hasta }, hasta: { [Op.gte]: desde }, ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}) }
    })
    if (cruce) {
        throw new ConflictError(`Se cruza con otras vacaciones (${fechaChilena(cruce.desde)} al ${fechaChilena(cruce.hasta)})`)
    }
    const licencia = await LicenciaMedica.findOne({ where: { trabajador_id: trabajador.id, fecha_inicio: { [Op.lte]: hasta }, fecha_termino: { [Op.gte]: desde } } })
    if (licencia) {
        throw new ConflictError(`Se cruza con una licencia médica (${fechaChilena(licencia.fecha_inicio)} al ${fechaChilena(licencia.fecha_termino)})`)
    }
    const dias = fechasHabiles(desde, hasta, await feriadosEntre(desde, hasta, await comunaDelContrato(trabajador.id, desde))).length
    if (dias === 0) {
        throw new ValidationError("El período no tiene días hábiles (lunes a viernes que no sean feriado)")
    }
    return dias
}

async function crearVacacion(datos, empresasPermitidas, usuarioId) {
    const trabajador = await obtenerTrabajador(datos?.trabajador_id, empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.SOLICITAR_VACACIONES)
    await exigirMesesAbiertos(trabajador.empresa_id, datos.desde ?? "", datos.hasta ?? "")
    const dias = await validarSolicitud(trabajador, datos)
    const despues = await saldoDe(trabajador, { agregar: { id: 0, desde: datos.desde, dias } })

    const vacacion = await Vacacion.create({
        trabajador_id: trabajador.id,
        desde: datos.desde,
        hasta: datos.hasta,
        dias_habiles: dias,
        anticipadas: despues.disponible < 0,
        observaciones: typeof datos.observaciones === "string" && datos.observaciones.trim() ? datos.observaciones.trim() : null,
        usuario_registro_id: usuarioId
    })
    const avisos = despues.disponible < 0
        ? [`Quedan ${Math.abs(despues.disponible)} día(s) como vacaciones anticipadas: se descuentan de lo que gane después`]
        : []
    return { vacacion, saldoDespues: despues.disponible, avisos }
}

// El resumen del mes (si existe) toma los días de vacaciones del libro y, si estaba aprobado, vuelve a pendiente.
async function sincronizarResumenes(trabajador, desde, hasta, transaction) {
    for (const { anio, mes } of mesesEntre(desde, hasta)) {
        const periodo = await PeriodoRemuneracion.findOne({ where: { empresa_id: trabajador.empresa_id, anio, mes }, transaction })
        if (periodo === null) {
            continue
        }
        const resumen = await ResumenAsistencia.findOne({ where: { periodo_id: periodo.id, trabajador_id: trabajador.id }, transaction })
        if (resumen === null) {
            continue
        }
        const libro = await libroDelTrabajador(trabajador, anio, mes, transaction)
        const cambios = { dias_vacaciones: libro.totales.dias_vacaciones }
        if (resumen.estado === "aprobado") {
            Object.assign(cambios, { estado: "pendiente", aprobado_por_id: null, fecha_aprobacion: null })
        }
        await resumen.update(cambios, { transaction })
    }
}

// Días del libro en que se marcan las vacaciones: los laborales según la jornada; sin plantilla, lunes a viernes sin feriados.
async function diasParaMarcar(trabajador, desde, hasta, transaction) {
    const dias = []
    const ocupados = []
    for (const { anio, mes } of mesesEntre(desde, hasta)) {
        const libro = await libroDelTrabajador(trabajador, anio, mes, transaction)
        for (const fila of libro.dias) {
            if (fila.fecha < desde || fila.fecha > hasta) {
                continue
            }
            const sinHorarioHabil = fila.esperado.tipo === "sin_horario" && fila.diaSemana >= 1 && fila.diaSemana <= 5
            if (fila.esperado.tipo !== "laboral" && !sinHorarioHabil) {
                continue
            }
            if (fila.marca && fila.marca.estado_aprobacion !== "rechazada") {
                ocupados.push(fila.fecha)
                continue
            }
            dias.push({ fecha: fila.fecha, rechazada: fila.marca?.id ?? null })
        }
    }
    return { dias, ocupados }
}

async function aprobarVacacion(id, empresasPermitidas, usuarioId) {
    const vacacion = await obtenerVacacion(id, empresasPermitidas)
    const trabajador = await Trabajador.findByPk(vacacion.trabajador_id)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_VACACIONES)
    if (vacacion.estado !== "pendiente") {
        throw new ConflictError(`Las vacaciones están ${vacacion.estado}`)
    }
    await exigirMesesAbiertos(trabajador.empresa_id, vacacion.desde, vacacion.hasta)
    const dias = await validarSolicitud(trabajador, vacacion, vacacion.id)

    return await sequelize.transaction(async (transaction) => {
        const { dias: marcar, ocupados } = await diasParaMarcar(trabajador, vacacion.desde, vacacion.hasta, transaction)
        if (ocupados.length > 0) {
            throw new ConflictError(`Ya hay marcas de asistencia en: ${ocupados.map(fechaChilena).join(", ")}. Elimínalas o recházalas antes de aprobar las vacaciones`)
        }
        const rechazadas = marcar.map((d) => d.rechazada).filter(Boolean)
        if (rechazadas.length > 0) {
            await Asistencia.destroy({ where: { id: rechazadas }, transaction })
        }
        const ahora = new Date()
        for (const { fecha } of marcar) {
            await Asistencia.create({
                trabajador_id: trabajador.id, fecha, tipo: "vacaciones", fuente: "otro", vacacion_id: vacacion.id,
                observaciones: `Vacaciones del ${fechaChilena(vacacion.desde)} al ${fechaChilena(vacacion.hasta)}`,
                usuario_registro_id: usuarioId, estado_aprobacion: "aprobada", aprobado_por_id: usuarioId, fecha_aprobacion: ahora
            }, { transaction })
        }
        const despues = await saldoDe(trabajador, { agregar: { id: vacacion.id, desde: vacacion.desde, dias } })
        await vacacion.update({ estado: "aprobada", dias_habiles: dias, anticipadas: despues.disponible < 0, aprobado_por_id: usuarioId, fecha_aprobacion: ahora }, { transaction })
        await sincronizarResumenes(trabajador, vacacion.desde, vacacion.hasta, transaction)
        return vacacion
    })
}

function exigirMotivo(motivo) {
    if (typeof motivo !== "string" || motivo.trim().length < 3) {
        throw new ValidationError("Indica el motivo")
    }
    return motivo.trim()
}

async function rechazarVacacion(id, motivo, empresasPermitidas, usuarioId) {
    const vacacion = await obtenerVacacion(id, empresasPermitidas)
    await exigirRol(usuarioId, vacacion.Trabajador.empresa_id, PERMISOS.APROBAR_VACACIONES)
    if (vacacion.estado !== "pendiente") {
        throw new ConflictError(`Las vacaciones están ${vacacion.estado}`)
    }
    return await vacacion.update({ estado: "rechazada", motivo: exigirMotivo(motivo), aprobado_por_id: usuarioId, fecha_aprobacion: new Date() })
}

// Anular unas vacaciones aprobadas: se borran sus marcas (meses abiertos) y el resumen vuelve a pendiente.
async function anularVacacion(id, motivo, empresasPermitidas, usuarioId) {
    const vacacion = await obtenerVacacion(id, empresasPermitidas)
    const trabajador = await Trabajador.findByPk(vacacion.trabajador_id)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_VACACIONES)
    if (vacacion.estado !== "aprobada") {
        throw new ConflictError("Solo se anulan vacaciones aprobadas; una pendiente se elimina o se rechaza")
    }
    const texto = exigirMotivo(motivo)
    await exigirMesesAbiertos(trabajador.empresa_id, vacacion.desde, vacacion.hasta)
    return await sequelize.transaction(async (transaction) => {
        await Asistencia.destroy({ where: { vacacion_id: vacacion.id }, transaction })
        await vacacion.update({ estado: "anulada", motivo: texto }, { transaction })
        await sincronizarResumenes(trabajador, vacacion.desde, vacacion.hasta, transaction)
        return vacacion
    })
}

async function eliminarVacacion(id, empresasPermitidas, usuarioId) {
    const vacacion = await obtenerVacacion(id, empresasPermitidas)
    await exigirRol(usuarioId, vacacion.Trabajador.empresa_id, PERMISOS.SOLICITAR_VACACIONES)
    if (vacacion.estado !== "pendiente") {
        throw new ConflictError("Solo se eliminan solicitudes pendientes")
    }
    await vacacion.destroy()
}

async function listarVacaciones(empresasPermitidas) {
    return await Vacacion.findAll({
        include: [{ model: Trabajador, attributes: ["id", "empresa_id", "persona_id", "fecha_ingreso", "fecha_termino"], where: { empresa_id: empresasPermitidas }, required: true, include: [{ model: Persona, attributes: ["nombres", "apellido_paterno", "apellido_materno", "rut", "dv"] }] }],
        order: [["desde", "DESC"], ["id", "DESC"]]
    })
}

async function saldoTrabajador(trabajadorId, empresasPermitidas) {
    const trabajador = await obtenerTrabajador(trabajadorId, empresasPermitidas)
    if (!trabajador.fecha_ingreso) {
        throw new ConflictError("El trabajador no tiene fecha de ingreso")
    }
    const inicial = await VacacionSaldoInicial.findOne({ where: { trabajador_id: trabajador.id } })
    return { ...(await saldoDe(trabajador)), saldoInicial: inicial }
}

// Saldo inicial (días pendientes de períodos cumplidos a una fecha de corte). dias = null lo borra.
async function guardarSaldoInicial(trabajadorId, datos, empresasPermitidas, usuarioId) {
    const trabajador = await obtenerTrabajador(trabajadorId, empresasPermitidas)
    await exigirRol(usuarioId, trabajador.empresa_id, PERMISOS.APROBAR_VACACIONES)
    if (datos?.dias === null) {
        await VacacionSaldoInicial.destroy({ where: { trabajador_id: trabajador.id } })
        return null
    }
    const dias = Number(String(datos?.dias ?? "").replace(",", "."))
    if (!Number.isFinite(dias) || dias < 0 || dias > 200) {
        throw new ValidationError("Los días pendientes deben ser un número entre 0 y 200")
    }
    if (!esFechaValida(datos.fecha_corte) || datos.fecha_corte < trabajador.fecha_ingreso || datos.fecha_corte > hoyChile()) {
        throw new ValidationError("La fecha de corte debe ser una fecha válida, desde el ingreso y hasta hoy")
    }
    const valores = {
        trabajador_id: trabajador.id, fecha_corte: datos.fecha_corte, dias: Math.round(dias * 100) / 100,
        documento: typeof datos.documento === "string" && datos.documento.trim() ? datos.documento.trim().slice(0, 200) : null,
        usuario_registro_id: usuarioId
    }
    const existente = await VacacionSaldoInicial.findOne({ where: { trabajador_id: trabajador.id } })
    return existente ? await existente.update(valores) : await VacacionSaldoInicial.create(valores)
}

// Feriado progresivo (art. 68): años con empleadores anteriores de la persona, con el respaldo obligatorio
// (certificado de cotizaciones de la AFP). anios = null lo borra. Se reconocen hasta 10 al calcular.
async function guardarProgresivo(personaId, datos, empresasPermitidas, usuarioId) {
    const { obtenerPersonaPorId } = require("../trabajadores/persona.service.js")
    const persona = await obtenerPersonaPorId(personaId, empresasPermitidas)
    await exigirRol(usuarioId, persona.empresa_id, PERMISOS.APROBAR_VACACIONES)
    if (datos?.anios === null) {
        return await persona.update({ anios_previos_progresivo: null, respaldo_progresivo: null })
    }
    const anios = Number(datos?.anios)
    if (!Number.isInteger(anios) || anios < 0 || anios > 60) {
        throw new ValidationError("Los años con empleadores anteriores deben ser un número entero entre 0 y 60")
    }
    const respaldo = typeof datos.respaldo === "string" ? datos.respaldo.trim() : ""
    if (anios > 0 && respaldo.length < 3) {
        throw new ValidationError("Indica el respaldo: certificado de cotizaciones de la AFP (número, fecha o descripción)")
    }
    return await persona.update({ anios_previos_progresivo: anios, respaldo_progresivo: respaldo.slice(0, 200) || null })
}

// Art. 44: relación de hasta 30 días, o hasta 60 si su primer contrato era a plazo fijo pactado por hasta 30 días.
async function aplicaArt44(trabajador) {
    const { ContratoAnexo } = require("../shared/associations.js")
    const { contratoOriginal } = require("../contratos/contrato_original.js")
    const duracion = (desde, hasta) => Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000) + 1
    const total = duracion(trabajador.fecha_ingreso, trabajador.fecha_termino)
    if (total <= 30) {
        return true
    }
    if (total > 60) {
        return false
    }
    const primero = await ContratoTrabajo.findOne({ where: { trabajador_id: trabajador.id, estado: { [Op.ne]: "anulado" } }, order: [["fecha_inicio", "ASC"]] })
    if (!primero) {
        return false
    }
    const anexos = await ContratoAnexo.findAll({ where: { contrato_id: primero.id } })
    const original = contratoOriginal(primero.toJSON(), anexos.map((a) => a.toJSON()))
    return original.tipo_contrato === "plazo_fijo" && Boolean(original.fecha_termino) && duracion(original.fecha_inicio, original.fecha_termino) <= 30
}

// Feriado a pagar en el finiquito (días del módulo de vacaciones a la fecha del término).
async function feriadoParaFiniquito(trabajador) {
    const saldo = await saldoDe(trabajador, { aFecha: trabajador.fecha_termino })
    const comuna = await comunaDelContrato(trabajador.id, trabajador.fecha_termino)
    const hasta = new Date(Date.parse(`${trabajador.fecha_termino}T00:00:00Z`) + 400 * 86400000).toISOString().slice(0, 10)
    const feriados = await feriadosEntre(trabajador.fecha_termino, hasta, comuna)
    const art44 = await aplicaArt44(trabajador)
    return {
        ...feriadoFiniquito({ saldo, fechaTermino: trabajador.fecha_termino, feriados, art44 }),
        ganados: saldo.ganados,
        tomados: saldo.tomados,
        periodos: saldo.periodos.filter((p) => p.cumplido).map(({ tipo, numero, desde, hasta: fin, ganados, tomados, pendientes }) => ({ tipo, numero, desde, hasta: fin, ganados, tomados, pendientes }))
    }
}

module.exports = {
    feriadoParaFiniquito,
    aplicaArt44,
    guardarProgresivo,
    crearVacacion, aprobarVacacion, rechazarVacacion, anularVacacion, eliminarVacacion,
    listarVacaciones, saldoTrabajador, guardarSaldoInicial, mesesEntre
}
