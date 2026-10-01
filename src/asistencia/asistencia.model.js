const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Asistencia = sequelize.define("Asistencia", {
    trabajador_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    hora_entrada: {
        type: DataTypes.TIME,
        allowNull: true
    },
    hora_salida: {
        type: DataTypes.TIME,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM(
            "normal",
            "atraso",
            "inasistencia",
            "permiso",
            "vacaciones",
            "licencia_medica"
        ),
        allowNull: false
    },
    fuente: {
        type: DataTypes.ENUM(
            "manual",
            "geovictoria",
            "importado_csv",
            "otro"
        ),
        defaultValue: "manual",
        allowNull: false
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    usuario_registro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    estado_aprobacion: {
        type: DataTypes.ENUM(
            "pendiente", "aprobada", "rechazada"
        ),
        defaultValue: "pendiente",
    },
    aprobado_por_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    fecha_aprobacion: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    tableName: "asistencias",
    indexes: [
        {
            unique: true,
            fields: ["trabajador_id", "fecha"]
        }
    ]
},
)

module.exports = {
    Asistencia
}