const { Op } = require("sequelize")
const { Trabajador, ContratoTrabajo, ContratoAnexo, Jornada, Asistencia, LicenciaMedica } = require("../shared/associations.js")
const { Feriado } = require("../calendario/feriado.model.js")
const { feriadosAplicables } = require("../calendario/feriado_calculo.js")
const { calcularLibro } = require("./libro_asistencia.js")
const { NotFoundError, ValidationError } = require("../shared/errors.js")
const { fechaTerminoVigente } = require("../contratos/contrato_original.js")

function rangoDelMes(anio, mes) {
    const mm = String(mes).padStart(2, "0")
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
    return { primerDia: `${anio}-${mm}-01`, ultimoDia: `${anio}-${mm}-${String(ultimo).padStart(2, "0")}` }
}

// El contrato que rige el mes: el más reciente (no anulado) que se cruza con el mes.
async function contratoDelMes(trabajadorId, primerDia, ultimoDia, transaction) {
    return await ContratoTrabajo.findOne({
        where: {
            trabajador_id: trabajadorId,
            estado: { [Op.ne]: "anulado" },
            fecha_inicio: { [Op.lte]: ultimoDia },
            [Op.or]: [{ fecha_termino: null }, { fecha_termino: { [Op.gte]: primerDia } }]
        },
        order: [["fecha_inicio", "DESC"]],
        transaction
    })
}

// Tramos de jornada del contrato: la inicial y cada cambio por anexo firmado (campo jornada_id).
async function tramosDeJornada(contrato, transaction) {
    const anexos = await ContratoAnexo.findAll({
        where: { contrato_id: contrato.id, campo_modificado: "jornada_id", estado_firma: "firmado" },
        order: [["fecha_vigencia", "ASC"], ["id", "ASC"]],
        transaction
    })

    const tramos = anexos.length === 0
        ? [{ desde: "0000-01-01", jornadaId: contrato.jornada_id }]
        : [{ desde: "0000-01-01", jornadaId: anexos[0].valor_anterior },
            ...anexos.map((a) => ({ desde: a.fecha_vigencia, jornadaId: a.valor_nuevo }))]

    const ids = [...new Set(tramos.map((t) => Number(t.jornadaId)).filter((id) => id > 0))]
    const jornadas = ids.length === 0 ? [] : await Jornada.findAll({ where: { id: ids }, transaction })
    const porId = new Map(jornadas.map((j) => [j.id, j]))

    return tramos.map((t) => {
        const jornada = porId.get(Number(t.jornadaId)) ?? null
        return { desde: t.desde, dias: jornada ? jornada.dias : null, jornada_id: jornada?.id ?? null, nombre: jornada?.nombre ?? null }
    })
}

// Libro del mes de un trabajador (sin revisar permisos: lo usan obtenerLibro y la generación del resumen).
async function libroDelTrabajador(trabajador, anio, mes, transaction) {
    const { primerDia, ultimoDia } = rangoDelMes(anio, mes)
    const contrato = await contratoDelMes(trabajador.id, primerDia, ultimoDia, transaction)

    // En serie: dentro de una transacción las consultas comparten la misma conexión.
    const feriados = await Feriado.findAll({ where: { fecha: { [Op.between]: [primerDia, ultimoDia] } }, transaction })
    const licencias = await LicenciaMedica.findAll({
        where: { trabajador_id: trabajador.id, fecha_inicio: { [Op.lte]: ultimoDia }, fecha_termino: { [Op.gte]: primerDia } },
        transaction
    })
    const marcas = await Asistencia.findAll({ where: { trabajador_id: trabajador.id, fecha: { [Op.between]: [primerDia, ultimoDia] } }, transaction })

    if (contrato === null) {
        const vacio = calcularLibro({ anio, mes, desde: "9999-12-31", marcas: marcas.map((m) => m.toJSON()) })
        return { ...vacio, contrato: null, tramos: [], advertencias: ["El trabajador no tiene contrato en este mes"] }
    }

    const tramos = await tramosDeJornada(contrato, transaction)
    const libro = calcularLibro({
        anio,
        mes,
        desde: contrato.fecha_inicio,
        hasta: fechaTerminoVigente(contrato) ?? trabajador.fecha_termino ?? null,
        tramosJornada: tramos,
        feriados: feriadosAplicables(feriados.map((f) => f.toJSON()), contrato.comuna_prestacion ?? null),
        licencias: licencias.map((l) => l.toJSON()),
        marcas: marcas.map((m) => m.toJSON())
    })

    if (!contrato.comuna_prestacion) {
        libro.advertencias.push("El contrato no tiene comuna de prestación: solo se consideran los feriados nacionales")
    }

    return {
        ...libro,
        contrato: { id: contrato.id, comuna_prestacion: contrato.comuna_prestacion, tipo_jornada: contrato.tipo_jornada },
        tramos: tramos.map(({ desde, jornada_id, nombre }) => ({ desde, jornada_id, nombre }))
    }
}

async function obtenerLibro({ trabajador_id, anio, mes }, empresasPermitidas) {
    const año = Number(anio)
    const numeroMes = Number(mes)
    if (!Number.isInteger(año) || año < 2000 || año > 2100 || !Number.isInteger(numeroMes) || numeroMes < 1 || numeroMes > 12) {
        throw new ValidationError("Indica el año y el mes")
    }

    const trabajador = await Trabajador.findByPk(trabajador_id)
    if (trabajador === null || !empresasPermitidas.includes(trabajador.empresa_id)) {
        throw new NotFoundError("Trabajador no encontrado")
    }

    return { trabajador_id: trabajador.id, anio: año, mes: numeroMes, ...await libroDelTrabajador(trabajador, año, numeroMes) }
}

module.exports = { obtenerLibro, libroDelTrabajador }
