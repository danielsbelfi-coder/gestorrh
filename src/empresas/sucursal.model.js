const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Sucursal de la empresa. La casa matriz no es una fila: es la dirección y comuna de la empresa.
const Sucursal = sequelize.define("Sucursal", {
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Código de comuna de la tabla de la Dirección del Trabajo (LRE, código 1106).
    comuna: {
        type: DataTypes.STRING(5),
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: "sucursales",
    indexes: [{ unique: true, fields: ["empresa_id", "nombre"] }]
})

module.exports = { Sucursal }
