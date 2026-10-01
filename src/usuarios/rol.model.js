const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Rol = sequelize.define("Rol", {
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "roles"
})

module.exports = {
    Rol
}