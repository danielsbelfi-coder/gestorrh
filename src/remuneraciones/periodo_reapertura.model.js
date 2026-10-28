const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Registro de cada vez que un periodo cerrado se volvió a abrir: quién, cuándo y por qué.
const PeriodoReapertura = sequelize.define("PeriodoReapertura", {
    periodo_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    motivo: { type: DataTypes.TEXT, allowNull: false },
    fecha_cierre_anterior: { type: DataTypes.DATEONLY, allowNull: true }
}, {
    tableName: "periodo_reaperturas"
})

module.exports = { PeriodoReapertura }
