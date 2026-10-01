const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Trabajador = sequelize.define("Trabajador", {
    persona_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_ingreso: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    fecha_termino: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM(
            "postulante",
            "activo",
            "suspendido",
            "con_licencia",
            "desvinculado",
            "historico"),
        defaultValue: "postulante"
    }
}, {
    tableName: "trabajadores"
}
)

module.exports = {
    Trabajador
}