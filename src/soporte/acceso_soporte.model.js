const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Autorización que da un administrador de la cuenta para que soporte consulte una empresa durante un plazo.
const AccesoSoporte = sequelize.define("AccesoSoporte", {
    cuenta_id: { type: DataTypes.INTEGER, allowNull: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    autorizado_por_id: { type: DataTypes.INTEGER, allowNull: true },
    motivo: { type: DataTypes.TEXT, allowNull: false },
    desde: { type: DataTypes.DATE, allowNull: false },
    hasta: { type: DataTypes.DATE, allowNull: false },
    revocado_en: { type: DataTypes.DATE, allowNull: true },
    revocado_por_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "accesos_soporte"
})

module.exports = { AccesoSoporte }
