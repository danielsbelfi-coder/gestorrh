const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const ContratoTrabajo = sequelize.define("ContratoTrabajo", {
    trabajador_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo_contrato: {
        type: DataTypes.ENUM("indefinido", "plazo_fijo", "obra_faena"),
        allowNull: false
    },
    fecha_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
        fecha_termino: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    causal_plazo_fijo: {
        type: DataTypes.STRING,
        allowNull: true
    },
        obra_faena_descripcion: {
        type: DataTypes.STRING,
        allowNull: true
    },
    cargo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    funciones: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    lugar_prestacion_servicios: {
        type: DataTypes.STRING,
        allowNull: false
    },
    tipo_jornada: {
        type: DataTypes.ENUM("completa", "parcial", "excluido_limitacion"),
        allowNull: false
    },
    horas_semanales: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    dias_trabajados: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sistema_remuneracion: {
        type: DataTypes.ENUM("mensual", "diario", "semanal", "hora"),
        allowNull: false
    },
    sueldo_base: {
        type: DataTypes.DECIMAL,
        allowNull: false
    },
    periodicidad_pago: {
        type: DataTypes.ENUM("mensual", "quincenal", "semanal"),
        allowNull: false
    },
    estado_firma: {
        type: DataTypes.ENUM("pendiente", "firmado", "rechazado"),
        defaultValue: "pendiente"
    },
    fecha_firma: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM("vigente", "terminado", "anulado"),
        defaultValue: "vigente"
    }
},{
    tableName: "contratos_trabajo"
})

module.exports = {
    ContratoTrabajo
}