const { ParametroLegal } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { ValidationError, NotFoundError } = require("../shared/errors.js")

async function corregirValorParametro(id, datos) {
    const parametro = await ParametroLegal.findByPk(id)

    if (parametro === null) {
        throw new NotFoundError("Parámetro no encontrado")
    }

    const valor = datos?.valor
    const esNumero = (typeof valor === "number" || typeof valor === "string") && valor !== "" && Number.isFinite(Number(valor))

    if (!esNumero || Number(valor) < 0) {
        throw new ValidationError("El valor debe ser un número mayor o igual a 0")
    }

    return await parametro.update(datos, {
        fields: ["valor", "descripcion", "fuente"]
    })
}

async function obtenerParametroVigente(codigo, fecha) {
    return await ParametroLegal.findOne({
        where: {
            codigo: codigo,
            vigencia_desde: { [Op.lte]: fecha },
            [Op.or]: [
                { vigencia_hasta: null },
                { vigencia_hasta: { [Op.gte]: fecha } }
            ]
        }
    })
}

async function listarVersionesPorCodigo(codigo) {
    return await ParametroLegal.findAll({
        where: {
            codigo: codigo
        },
        order: [["vigencia_desde", "ASC"]]
    })
}

module.exports = {
    corregirValorParametro,
    obtenerParametroVigente,
    listarVersionesPorCodigo
}