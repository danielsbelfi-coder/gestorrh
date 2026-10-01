const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const PeriodoRemuneracion = sequelize.define("PeriodoRemuneracion", {
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    mes: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    anio: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            "abierto",
            "cerrado"
            ),
            defaultValue: "abierto"
    },
    fecha_apertura: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_cierre: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: "periodos_remuneracion",
    indexes: [
        {
            unique: true,
            fields: ["empresa_id", "mes", "anio"]
        }
    ]
})

module.exports = {
    PeriodoRemuneracion
}