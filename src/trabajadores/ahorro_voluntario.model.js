const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { TIPOS_AHORRO, REGIMENES, MODALIDADES } = require("../remuneraciones/ahorro_voluntario.js")

// APV individual, APV colectivo o depósito convenido de una persona, vigente desde un mes hasta otro (hasta null = sin término).
const AhorroVoluntario = sequelize.define("AhorroVoluntario", {
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.ENUM(...TIPOS_AHORRO), allowNull: false },
    institucion_codigo: { type: DataTypes.STRING(3), allowNull: false },
    institucion_nombre: { type: DataTypes.STRING(80), allowNull: false },
    numero_contrato: { type: DataTypes.STRING(20), allowNull: true },
    forma_pago: { type: DataTypes.SMALLINT, allowNull: false },
    regimen: { type: DataTypes.ENUM(...REGIMENES), allowNull: true },
    modalidad: { type: DataTypes.ENUM(...MODALIDADES), allowNull: false },
    monto: { type: DataTypes.DECIMAL(12, 4), allowNull: false },
    aporte_empleador: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    hasta: { type: DataTypes.DATEONLY, allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "ahorros_voluntarios_persona",
    name: { singular: "AhorroVoluntario", plural: "AhorrosVoluntarios" }
})

module.exports = { AhorroVoluntario }
