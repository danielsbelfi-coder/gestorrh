// Las relaciones laborales (Trabajador) de una misma persona en una empresa no se pueden cruzar:
// una nueva empieza después del término de la anterior. Así cada liquidación cuenta solo sus días.
const { Op } = require("sequelize")
const { ConflictError } = require("../shared/errors.js")

const fechaCorta = (fecha) => fecha ? String(fecha).slice(0, 10).split("-").reverse().join("-") : ""

// Pura: la primera relación de "otras" que se cruza con [desde, hasta] (hasta null = sin término). null si ninguna.
function relacionQueSeCruza(otras, desde, hasta) {
    return otras.find((otra) =>
        (otra.fecha_termino === null || otra.fecha_termino === undefined || otra.fecha_termino >= desde) &&
        (hasta === null || hasta === undefined || otra.fecha_ingreso <= hasta)) ?? null
}

function mensajeCruce(otra) {
    const hasta = otra.fecha_termino ? `hasta el ${fechaCorta(otra.fecha_termino)}` : "sin término"
    return `La persona ya tiene una relación laboral en la empresa desde el ${fechaCorta(otra.fecha_ingreso)} ${hasta}: la nueva debe empezar después del término de esa relación`
}

// Lanza 409 si [desde, hasta] se cruza con otra relación de la persona en la empresa.
async function exigirSinCruce(Trabajador, { personaId, empresaId, desde, hasta = null, excluirId = null, transaction }) {
    const otras = await Trabajador.findAll({
        where: { persona_id: personaId, empresa_id: empresaId, ...(excluirId ? { id: { [Op.ne]: excluirId } } : {}) },
        transaction
    })
    const cruce = relacionQueSeCruza(otras.map((o) => o.toJSON ? o.toJSON() : o), desde, hasta)
    if (cruce !== null) {
        throw new ConflictError(mensajeCruce(cruce))
    }
}

module.exports = { relacionQueSeCruza, mensajeCruce, exigirSinCruce }
