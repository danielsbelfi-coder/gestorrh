const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Afp = sequelize.define("Afp", {
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
    comision: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    }
}, {
    tableName: "afps"
})

module.exports = {
    Afp
}