const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const SituacionPrevisional = sequelize.define("SituacionPrevisional", {
    persona_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    desde: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    pensionado: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    cotiza_afp: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    // Ley 18.156: no cotiza en la AFP ni paga SIS ni aportes de la reforma; sí salud, cesantía y mutual.
    tecnico_extranjero: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    tipo_pension: {
        type: DataTypes.ENUM("vejez", "invalidez_total", "invalidez_parcial", "sobrevivencia"),
        allowNull: true
    },
    usuario_registro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "situaciones_previsionales",
    name: {
        singular: "SituacionPrevisional",
        plural: "SituacionesPrevisionales"
    }
})

module.exports = {
    SituacionPrevisional
}