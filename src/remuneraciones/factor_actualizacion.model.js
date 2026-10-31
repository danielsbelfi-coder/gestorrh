const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Factor de actualización del SII para la DJ 1887: uno por mes del año comercial, común a todas las cuentas.
const FactorActualizacion = sequelize.define("FactorActualizacion", {
    anio: { type: DataTypes.INTEGER, allowNull: false },
    mes: { type: DataTypes.INTEGER, allowNull: false },
    factor: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "factores_actualizacion",
    name: { singular: "FactorActualizacion", plural: "FactoresActualizacion" }
})

module.exports = { FactorActualizacion }
