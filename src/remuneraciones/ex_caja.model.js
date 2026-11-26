const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Paquete AG: ex-caja de previsión y régimen del antiguo sistema (IPS, ex INP), con sus códigos del LRE (1142), de
// Previred (62) y de desahucio (67), y sus tasas con vigencia.
const ExCajaRegimen = sequelize.define("ExCajaRegimen", {
    codigo_lre: { type: DataTypes.INTEGER, allowNull: false },
    codigo_previred: { type: DataTypes.STRING(4), allowNull: false },
    caja: { type: DataTypes.STRING(80), allowNull: false },
    regimen: { type: DataTypes.INTEGER, allowNull: false },
    codigo_desahucio: { type: DataTypes.STRING(4), allowNull: true }
}, { tableName: "ex_cajas_regimen", name: { singular: "ExCajaRegimen", plural: "ExCajasRegimen" } })

const TasaExCaja = sequelize.define("TasaExCaja", {
    ex_caja_regimen_id: { type: DataTypes.INTEGER, allowNull: false },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    tasa_prevision: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    tasa_desahucio: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    fuente: { type: DataTypes.STRING(255), allowNull: true }
}, { tableName: "tasas_ex_caja", name: { singular: "TasaExCaja", plural: "TasasExCaja" } })

module.exports = { ExCajaRegimen, TasaExCaja }
