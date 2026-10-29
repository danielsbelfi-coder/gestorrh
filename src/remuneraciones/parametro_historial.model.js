const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Quién cambió un parámetro legal común, cuándo, y el valor antes y después.
const ParametroHistorial = sequelize.define("ParametroHistorial", {
    accion: {
        type: DataTypes.ENUM("correccion", "apertura_mes"),
        allowNull: false
    },
    parametro_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    vigencia_desde: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    valor_anterior: {
        type: DataTypes.DECIMAL,
        allowNull: true
    },
    valor_nuevo: {
        type: DataTypes.DECIMAL,
        allowNull: true
    },
    detalle: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: "parametros_historial"
})

module.exports = { ParametroHistorial }
