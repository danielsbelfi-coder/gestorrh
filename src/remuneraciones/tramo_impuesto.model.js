const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const TramoImpuesto = sequelize.define("TramoImpuesto", {
    desde_utm: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    hasta_utm: {
        type: DataTypes.DECIMAL,
        allowNull: true,
    },
    tasa: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    rebaja_utm: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    vigencia_desde: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    vigencia_hasta: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
}, {
    tableName: "tramos_impuesto"
})

module.exports = {
    TramoImpuesto
}