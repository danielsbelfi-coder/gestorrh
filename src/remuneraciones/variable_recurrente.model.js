const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Variable permanente (todos los meses, hasta una fecha o hasta el término) o préstamo en cuotas. Ver «Paquete P» en el SPEC.
const VariableRecurrente = sequelize.define("VariableRecurrente", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false },
    concepto_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.ENUM("permanente", "cuotas"), allowNull: false },
    // Permanente: monto de cada mes. Cuotas: monto total del préstamo.
    monto: { type: DataTypes.INTEGER, allowNull: false },
    cuotas: { type: DataTypes.INTEGER, allowNull: true },
    proporcional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    desde_mes: { type: DataTypes.DATEONLY, allowNull: false },
    hasta_mes: { type: DataTypes.DATEONLY, allowNull: true },
    glosa: { type: DataTypes.STRING, allowNull: true },
    usuario_creo_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: "variables_recurrentes",
    name: { singular: "VariableRecurrente", plural: "VariablesRecurrentes" }
})

module.exports = { VariableRecurrente }
