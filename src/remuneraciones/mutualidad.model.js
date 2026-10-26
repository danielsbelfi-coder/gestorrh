const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Mutualidad = sequelize.define("Mutualidad", {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    estado: {
        type: DataTypes.ENUM("activo", "inactivo"),
        allowNull: false,
        defaultValue: "activo"
    },
    codigo_previred: {
        type: DataTypes.STRING(2),
        allowNull: true
    }
}, {
    tableName: "mutualidades"
})

module.exports = {
    Mutualidad
}