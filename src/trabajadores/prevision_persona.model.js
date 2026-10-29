const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Previsión (AFP y salud) de una persona desde un mes. "desde" = 1900-01-01 es la previsión «desde siempre».
const PrevisionPersona = sequelize.define("PrevisionPersona", {
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    afp_id: { type: DataTypes.INTEGER, allowNull: true },
    sistema_salud: { type: DataTypes.ENUM("Fonasa", "Isapre"), allowNull: true },
    isapre_id: { type: DataTypes.INTEGER, allowNull: true },
    plan_isapre_uf: { type: DataTypes.DECIMAL(8, 4), allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "previsiones_persona",
    name: { singular: "PrevisionPersona", plural: "PrevisionesPersona" },
    indexes: [{ unique: true, fields: ["persona_id", "desde"], name: "previsiones_persona_persona_desde_unique" }]
})

module.exports = { PrevisionPersona }
