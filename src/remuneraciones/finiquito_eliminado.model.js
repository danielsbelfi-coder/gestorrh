const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Finiquito eliminado: se guarda completo, con el motivo y si también se quitó el término del trabajador.
const FiniquitoEliminado = sequelize.define("FiniquitoEliminado", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false },
    finiquito_id: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.STRING(20), allowNull: false },
    datos: { type: DataTypes.JSONB, allowNull: false },
    motivo: { type: DataTypes.TEXT, allowNull: true },
    quito_termino: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "finiquitos_eliminados",
    name: { singular: "FiniquitoEliminado", plural: "FiniquitosEliminados" }
})

module.exports = { FiniquitoEliminado }
