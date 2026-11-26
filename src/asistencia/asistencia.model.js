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
    // Paquete AE: en un «domingo_libre», el día libre de la misma semana que se trabaja en su reemplazo (opcional).
    fecha_reemplazo: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM(
            "normal",
            "atraso",
            "inasistencia",
            "permiso_con_goce",
            "permiso_sin_goce",
            "vacaciones",
            "licencia_medica",
            "festivo_libre",
            "descanso_compensatorio",
            "domingo_libre"
        ),
        allowNull: false
    },
    // Recargo de las horas extra de esta marca: 50 (por defecto) o 100 (por trato o contrato).
    recargo_hora_extra: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50,
        validate: { isIn: [[50, 100]] }
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
    // Marca generada por unas vacaciones aprobadas (se anula desde Vacaciones, no desde Asistencia).
    vacacion_id: {
        type: DataTypes.INTEGER,
        allowNull: true
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
    // Sin esto, Sequelize singulariza "Asistencia" como "Asistencium" (regla de plurales latinos del inglés).
    name: { singular: "Asistencia", plural: "Asistencias" },
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