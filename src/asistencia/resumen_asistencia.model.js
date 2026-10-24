const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const ResumenAsistencia = sequelize.define("ResumenAsistencia", {
    periodo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    trabajador_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dias_inasistencia: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    dias_licencia_medica: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    dias_permiso_sin_goce: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    dias_vacaciones: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    minutos_atraso: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "aprobado"),
        allowNull: false,
        defaultValue: "pendiente"
    },
    fuente: {
        type: DataTypes.ENUM("manual", "asistencia", "importacion"),
        allowNull: false,
        defaultValue: "manual"
    },
    usuario_registro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    aprobado_por_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fecha_aprobacion: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: "resumenes_asistencia",
    name: {
        singular: "ResumenAsistencia",
        plural: "ResumenesAsistencia"
    },
    indexes: [
        {
            unique: true,
            fields: ["periodo_id", "trabajador_id"],
            name: "resumenes_asistencia_periodo_trabajador_unique"
        }
    ]
})

module.exports = {
    ResumenAsistencia
}