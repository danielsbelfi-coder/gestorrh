const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Plan = sequelize.define("Plan", {
    nombre: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    max_trabajadores: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    usuarios_incluidos: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: "planes",
    name: {
        singular: "Plan",
        plural: "Planes"
    }
})

module.exports = {
    Plan
}