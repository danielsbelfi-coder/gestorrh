const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Plantilla de jornada de una empresa. dias: los 7 días con { dia, trabaja, entrada, salida, colacion }.
const Jornada = sequelize.define("Jornada", {
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    tipo: { type: DataTypes.ENUM("semanal"), allowNull: false, defaultValue: "semanal" },
    dias: { type: DataTypes.JSONB, allowNull: false },
    horas_semanales: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    dias_trabajados: { type: DataTypes.SMALLINT, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    tableName: "jornadas",
    name: { singular: "Jornada", plural: "Jornadas" },
    indexes: [{ unique: true, fields: ["empresa_id", "nombre"], name: "jornadas_empresa_nombre_unique" }]
})

module.exports = {
    Jornada
}
