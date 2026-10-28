const { Mutualidad } = require("../shared/associations.js")

// Organismo administrador de la ley de accidentes que corresponde a una empresa.
// Una empresa sin mutualidad cotiza en el ISL (así lo dice la ficha de la empresa), por lo que
// los archivos de Previred y LRE deben informar el código del ISL.
async function mutualidadParaArchivos(empresa, buscarIsl = () => Mutualidad.findOne({ where: { codigo: "ISL" } })) {
    return empresa.Mutualidad ?? await buscarIsl()
}

module.exports = { mutualidadParaArchivos }
