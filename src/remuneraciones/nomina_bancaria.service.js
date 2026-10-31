// Nómina bancaria de liquidaciones (por periodo) y de finiquitos (masiva por mes o individual).
// Ver «Nómina bancaria» en el SPEC. Devuelve { filas, excluidas, total }; la pantalla arma el CSV.
const { Op } = require("sequelize")
const { Liquidacion, Finiquito, Trabajador, Persona } = require("../shared/associations.js")
const { obtenerPeriodoPorId } = require("./periodo_remuneracion.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { NotFoundError, ValidationError } = require("../shared/errors.js")
const { armarNomina } = require("./nomina_bancaria.js")

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const CON_PERSONA = { model: Trabajador, attributes: ["id", "persona_id", "empresa_id", "fecha_ingreso", "fecha_termino"], include: [Persona] }

// Liquidaciones del periodo: solo las emitidas van al archivo; las en borrador se informan aparte.
async function nominaLiquidaciones(periodoId, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)
    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.EMITIR_LIQUIDACION)

    const liquidaciones = await Liquidacion.findAll({ where: { periodo_id: periodo.id, vigente: true }, include: [CON_PERSONA] })
    const glosa = `Remuneración ${MESES[periodo.mes - 1]} ${periodo.anio}`
    return {
        periodo: { anio: periodo.anio, mes: periodo.mes },
        ...armarNomina(liquidaciones.map((l) => ({
            trabajador_id: l.trabajador_id,
            persona: l.Trabajador.Persona,
            monto: l.liquido_a_pagar,
            glosa,
            motivo: l.estado === "emitida" ? null : "Liquidación en borrador (sin cerrar)"
        })))
    }
}

// Finiquitos emitidos o pagados: de un trabajador, o de todos los que terminaron en el mes (AAAA-MM) de una empresa.
async function nominaFiniquitos({ trabajador_id: trabajadorId, empresa_id: empresaId, mes }, empresasPermitidas, usuarioId) {
    let finiquitos
    if (trabajadorId) {
        const finiquito = await Finiquito.findOne({ where: { trabajador_id: trabajadorId }, include: [CON_PERSONA] })
        if (finiquito === null || !empresasPermitidas.includes(finiquito.Trabajador.empresa_id)) {
            throw new NotFoundError("Finiquito no encontrado")
        }
        await exigirRol(usuarioId, finiquito.Trabajador.empresa_id, PERMISOS.GESTIONAR_FINIQUITOS)
        finiquitos = [finiquito]
    } else {
        if (!empresasPermitidas.includes(Number(empresaId))) {
            throw new NotFoundError("Empresa no encontrada")
        }
        if (typeof mes !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
            throw new ValidationError("El mes debe tener el formato AAAA-MM")
        }
        await exigirRol(usuarioId, Number(empresaId), PERMISOS.GESTIONAR_FINIQUITOS)
        const [anio, numero] = mes.split("-").map(Number)
        const ultimo = new Date(Date.UTC(anio, numero, 0)).getUTCDate()
        finiquitos = await Finiquito.findAll({
            include: [{ ...CON_PERSONA, where: { empresa_id: Number(empresaId), fecha_termino: { [Op.between]: [`${mes}-01`, `${mes}-${ultimo}`] } }, required: true }]
        })
    }

    return armarNomina(finiquitos.map((f) => ({
        trabajador_id: f.trabajador_id,
        persona: f.Trabajador.Persona,
        monto: f.total_a_pagar,
        glosa: "Finiquito",
        motivo: f.estado === "calculado" ? "Finiquito sin cerrar" : null
    })))
}

module.exports = { nominaLiquidaciones, nominaFiniquitos }
