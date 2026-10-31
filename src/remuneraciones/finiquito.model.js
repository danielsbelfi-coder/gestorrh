const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Finiquito = sequelize.define("Finiquito", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    fecha_finiquito: { type: DataTypes.DATEONLY, allowNull: false },
    lugar: { type: DataTypes.STRING(100), allowNull: false },
    aviso_previo_dado: { type: DataTypes.BOOLEAN, allowNull: false },
    dias_tomados: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
    dias_inhabiles: { type: DataTypes.INTEGER, allowNull: false },
    imputacion_afc: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    descuentos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    monto_feriado: { type: DataTypes.INTEGER, allowNull: false },
    monto_aviso_previo: { type: DataTypes.INTEGER, allowNull: false },
    monto_anios_servicio: { type: DataTypes.INTEGER, allowNull: false },
    total_descuentos: { type: DataTypes.INTEGER, allowNull: false },
    total_a_pagar: { type: DataTypes.INTEGER, allowNull: false },
    detalle_calculo: { type: DataTypes.JSONB, allowNull: false },
    estado: { type: DataTypes.ENUM("calculado", "emitido", "pagado"), allowNull: false, defaultValue: "calculado" },
    fecha_emision: { type: DataTypes.DATE, allowNull: true },
    fecha_pago: { type: DataTypes.DATEONLY, allowNull: true },
    emitido_por_id: { type: DataTypes.INTEGER, allowNull: true },
    // Saldo de pago en exceso no recuperado que se decidió no cobrar en una relación posterior.
    saldo_no_cobrar_motivo: { type: DataTypes.TEXT, allowNull: true },
    saldo_no_cobrar_en: { type: DataTypes.DATE, allowNull: true },
    saldo_no_cobrar_usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: "finiquitos"
})

module.exports = {
    Finiquito
}