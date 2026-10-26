const { Asistencia } = require("../shared/associations.js")
const { Op } = require("sequelize")

async function fechasDeMarcas(trabajadorId, tipo, primerDia, ultimoDia) {
    const marcas = await Asistencia.findAll({
        where: {
            trabajador_id: trabajadorId,
            tipo,
            estado_aprobacion: "aprobada",
            fecha: { [Op.between]: [primerDia, ultimoDia] }
        },
        attributes: ["fecha"]
    })

    return marcas.map((marca) => marca.fecha)
}

module.exports = { fechasDeMarcas }