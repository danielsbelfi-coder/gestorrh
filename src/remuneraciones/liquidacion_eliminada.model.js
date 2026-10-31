const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Liquidación eliminada: todas sus versiones con sus líneas, el motivo y quién la eliminó.
const LiquidacionEliminada = sequelize.define("LiquidacionEliminada", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false },
    periodo_id: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.STRING(20), allowNull: false },
    datos: { type: DataTypes.JSONB, allowNull: false },
    motivo: { type: DataTypes.TEXT, allowNull: true },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "liquidaciones_eliminadas",
    name: { singular: "LiquidacionEliminada", plural: "LiquidacionesEliminadas" }
})

module.exports = { LiquidacionEliminada }
