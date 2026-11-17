// Fecha de pago del periodo para una empresa: carga los feriados que rigen en la casa matriz y aplica la regla.
const { Op } = require("sequelize")
const { Feriado } = require("../calendario/feriado.model.js")
const { feriadosAplicables } = require("../calendario/feriado_calculo.js")
const { fechaDePago, rangoFeriados } = require("./fecha_pago.js")

async function fechaPagoDelPeriodo(empresa, anio, mes) {
    if (!empresa?.regla_fecha_pago) {
        return null
    }
    const { desde, hasta } = rangoFeriados(anio, mes)
    const feriados = await Feriado.findAll({ where: { fecha: { [Op.between]: [desde, hasta] } } })
    const aplicables = feriadosAplicables(feriados.map((f) => f.toJSON()), empresa.comuna ?? null)

    return fechaDePago({
        regla: empresa.regla_fecha_pago,
        dia: empresa.dia_pago,
        anio: Number(anio),
        mes: Number(mes),
        feriados: aplicables.map((f) => String(f.fecha).slice(0, 10))
    })
}

module.exports = { fechaPagoDelPeriodo }
