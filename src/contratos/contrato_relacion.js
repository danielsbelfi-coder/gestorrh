// El contrato de una relación laboral (Trabajador): el más reciente que no esté anulado, vigente o terminado.
// Al registrar el término, el contrato pasa a «terminado», pero la liquidación, el LRE y el finiquito del mes
// del término lo siguen usando.
const { Op } = require("sequelize")

async function contratoDeLaRelacion(ContratoTrabajo, trabajadorId, opciones = {}) {
    return await ContratoTrabajo.findOne({
        where: { trabajador_id: trabajadorId, estado: { [Op.ne]: "anulado" } },
        order: [["fecha_inicio", "DESC"], ["id", "DESC"]],
        ...opciones
    })
}

module.exports = { contratoDeLaRelacion }
