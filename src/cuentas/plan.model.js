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
    nombre_visible: {
        type: DataTypes.STRING,
        allowNull: true
    },
    precio_uf: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 0
    },
    precio_usuario_adicional_uf: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 0
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