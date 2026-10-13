const { sequelize } = require("../shared/database.js")
const { ParametroLegal } = require("../shared/associations.js")
const { Op } = require("sequelize")
const { ConflictError, ValidationError } = require("../shared/errors.js")

async function crearVersionParametro(datos) {
    if (!datos.codigo || !datos.vigencia_desde) {
        throw new ValidationError("Debe indicar el código y la fecha de vigencia")
    }

    const versionActual = await ParametroLegal.findOne({
        where: {
            codigo: datos.codigo,
            vigencia_hasta: null
        }
    })

    if (versionActual !== null) {
        if (datos.vigencia_desde <= versionActual.vigencia_desde) {
            throw new ConflictError("La nueva vigencia debe ser posterior a la version actual")
        }
    }

    const fecha = new Date(datos.vigencia_desde)
    fecha.setDate(fecha.getDate() - 1)
    const fechaCierre = fecha.toISOString().split("T")[0]

    return await sequelize.transaction(async (t) => {
        if (versionActual !== null)
            await versionActual.update({
                vigencia_hasta: fechaCierre
            }, {
                transaction: t
            })
        const nuevaVersion = await ParametroLegal.create(datos, {
            fields: [
                "codigo",
                "nombre",
                "valor",
                "tipo",
                "vigencia_desde",
                "descripcion",
                "fuente"
            ],
            transaction: t
        })
        return nuevaVersion
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
        }
    })
}

module.exports = {
    crearVersionParametro,
    obtenerParametroVigente,
    listarVersionesPorCodigo
}