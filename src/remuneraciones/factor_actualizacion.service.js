const { FactorActualizacion } = require("../shared/associations.js")
const { sequelize } = require("../shared/database.js")
const { ValidationError } = require("../shared/errors.js")
const { MESES, problemasFactores } = require("./dj1887.js")

function validarAnio(anio) {
    const numero = Number(anio)
    if (!Number.isInteger(numero) || numero < 2000 || numero > 2100) {
        throw new ValidationError("El año no es válido")
    }
    return numero
}

// { anio, factores: { [mes]: número }, completos }
async function factoresDelAnio(anio) {
    const numero = validarAnio(anio)
    const filas = await FactorActualizacion.findAll({ where: { anio: numero }, order: [["mes", "ASC"]] })
    const factores = Object.fromEntries(filas.map((fila) => [fila.mes, Number(fila.factor)]))
    return { anio: numero, factores, completos: problemasFactores(factores).length === 0 }
}

// Reemplaza los 12 factores del año (solo soporte; la ruta lo exige). factores: arreglo de 12 o { [mes]: valor }.
async function guardarFactores(anio, factores, usuarioId) {
    const numero = validarAnio(anio)
    const porMes = Array.isArray(factores)
        ? Object.fromEntries(factores.map((valor, indice) => [indice + 1, valor]))
        : factores
    const malos = problemasFactores(porMes)
    if (malos.length > 0) {
        throw new ValidationError(`Faltan factores o están fuera de rango (mayor que 0 y menor que 3) en los meses: ${malos.join(", ")}`)
    }

    await sequelize.transaction(async (transaction) => {
        for (const mes of MESES) {
            const factor = Math.round(Number(porMes[mes]) * 1000) / 1000
            const existente = await FactorActualizacion.findOne({ where: { anio: numero, mes }, transaction })
            if (existente) {
                await existente.update({ factor, usuario_id: usuarioId }, { transaction })
            } else {
                await FactorActualizacion.create({ anio: numero, mes, factor, usuario_id: usuarioId }, { transaction })
            }
        }
    })

    return await factoresDelAnio(numero)
}

module.exports = { factoresDelAnio, guardarFactores, validarAnio }
