const { Op, UniqueConstraintError } = require("sequelize")
const { Feriado } = require("./feriado.model.js")
const { validarFeriado, feriadosAplicables } = require("./feriado_calculo.js")
const { ValidationError, NotFoundError, ConflictError } = require("../shared/errors.js")
const { COMUNAS } = require("../shared/comunas_lre.js")

// Cualquier usuario consulta. Con comuna devuelve solo los feriados que rigen allá.
async function listarFeriados({ anio, comuna }) {
    const año = Number(anio)
    if (!Number.isInteger(año) || año < 2000 || año > 2100) {
        throw new ValidationError("Indica el año (AAAA)")
    }
    if (comuna !== undefined && COMUNAS[comuna] === undefined) {
        throw new ValidationError("La comuna no está en la tabla de la Dirección del Trabajo")
    }

    const feriados = await Feriado.findAll({
        where: { fecha: { [Op.between]: [`${año}-01-01`, `${año}-12-31`] } },
        order: [["fecha", "ASC"], ["alcance", "ASC"]]
    })

    return comuna === undefined ? feriados : feriadosAplicables(feriados, comuna)
}

async function guardar(feriado, entrada) {
    const { datos, errores } = validarFeriado(entrada)
    if (errores.length > 0) {
        throw new ValidationError(errores.join(". "))
    }

    try {
        return feriado === null
            ? await Feriado.create(datos)
            : await feriado.update(datos)
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            throw new ConflictError("Ya existe ese feriado en esa fecha y lugar")
        }
        throw error
    }
}

async function crearFeriado(entrada) {
    return await guardar(null, entrada)
}

async function actualizarFeriado(id, entrada) {
    const feriado = await Feriado.findByPk(id)
    if (feriado === null) {
        throw new NotFoundError("Feriado no encontrado")
    }
    // PATCH parcial: lo que no llega se mantiene.
    return await guardar(feriado, { ...feriado.toJSON(), ...entrada })
}

async function eliminarFeriado(id) {
    const feriado = await Feriado.findByPk(id)
    if (feriado === null) {
        throw new NotFoundError("Feriado no encontrado")
    }
    await feriado.destroy()
}

module.exports = { listarFeriados, crearFeriado, actualizarFeriado, eliminarFeriado }
