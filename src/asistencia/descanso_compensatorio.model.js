const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Descanso compensatorio otorgado (art. 25, paquete AC): rebaja el saldo de tiempo compensatorio que generan las
// esperas que se compensan con descanso. Se registra por horas (minutos) y se aprueba como los turnos.
const DescansoCompensatorio = sequelize.define("DescansoCompensatorio", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    minutos: { type: DataTypes.INTEGER, allowNull: false },
    observaciones: { type: DataTypes.STRING(300), allowNull: true },
    estado_aprobacion: { type: DataTypes.ENUM("pendiente", "aprobado"), allowNull: false, defaultValue: "pendiente" },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: false },
    aprobado_por_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "descansos_compensatorios",
    name: { singular: "DescansoCompensatorio", plural: "DescansosCompensatorios" }
})

module.exports = { DescansoCompensatorio }
