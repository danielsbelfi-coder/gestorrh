const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Cargo = sequelize.define("Cargo", {
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    departamento_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM("activo", "inactivo"),
        defaultValue: "activo"
    }
}, {
    tableName: "cargos",
    indexes: [
        {
            unique: true,
            fields: ["empresa_id", "nombre"]
        }
    ]
}
)

module.exports = {
    Cargo
}