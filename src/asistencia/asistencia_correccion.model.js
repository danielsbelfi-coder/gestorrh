const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const AsistenciaCorreccion = sequelize.define("AsistenciaCorreccion", {
    asistencia_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    campo_modificado: {
        type: DataTypes.STRING,
        allowNull: false
    },
    valor_anterior: {
        type: DataTypes.STRING,
        allowNull: false
    },
    valor_nuevo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    estado_aprobacion: {
        type: DataTypes.ENUM(
            "pendiente",
            "aprobada",
            "rechazada"
        ),
        defaultValue: "pendiente"
    },
    usuario_solicito_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    aprobado_por_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fecha_aprobacion: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: "asistencia_correcciones"
},
)

module.exports = {
    AsistenciaCorreccion
}