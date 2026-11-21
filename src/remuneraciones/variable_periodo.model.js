const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const VariablePeriodo = sequelize.define("VariablePeriodo", {
    periodo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    trabajador_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    concepto_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    cantidad: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true
    },
    monto: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // Horas extra manuales: primer día del mes (ya cerrado) en que se trabajaron. Las del mes van en el libro de asistencia.
    mes_origen: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    glosa: {
        type: DataTypes.STRING,
        allowNull: true
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "aprobada"),
        allowNull: false,
        defaultValue: "pendiente"
    },
    fuente: {
        type: DataTypes.ENUM("manual", "asistencia", "importacion", "recurrente", "turnos"),
        allowNull: false,
        defaultValue: "manual"
    },
    // Agregada por una variable permanente o un préstamo en cuotas (ver variable_recurrente.service.js).
    recurrente_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    numero_cuota: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    // El monto guardado es el del mes completo; la liquidación lo ajusta a los días pagados.
    proporcional: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
    tableName: "variables_periodo",
    name: {
        singular: "VariablePeriodo",
        plural: "VariablesPeriodo"
    }
})

module.exports = {
    VariablePeriodo
}