const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Eliminacion = sequelize.define("Eliminacion", {
    tipo: {
        type: DataTypes.ENUM("empresa", "cuenta"),
        allowNull: false
    },
    registro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rut: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dv: {
        type: DataTypes.STRING(1),
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    filas_por_tabla: {
        type: DataTypes.JSONB,
        allowNull: false
    }
}, {
    tableName: "eliminaciones",
    name: {
        singular: "Eliminacion",
        plural: "Eliminaciones"
    }
})

module.exports = {
    Eliminacion
}