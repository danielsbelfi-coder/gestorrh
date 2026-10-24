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
    tableName: "variables_periodo",
    name: {
        singular: "VariablePeriodo",
        plural: "VariablesPeriodo"
    }
})

module.exports = {
    VariablePeriodo
}