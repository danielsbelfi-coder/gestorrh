const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")
const { RELACIONES, TIPOS_CARGA, TRAMOS } = require("../remuneraciones/asignacion_familiar.js")

// Carga familiar de una persona, con las fechas del documento que la reconoce. "hasta" null = sin término indicado.
const CargaFamiliar = sequelize.define("CargaFamiliar", {
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    rut: { type: DataTypes.STRING(8), allowNull: true },
    dv: { type: DataTypes.STRING(1), allowNull: true },
    nombre: { type: DataTypes.STRING(120), allowNull: false },
    relacion: { type: DataTypes.ENUM(...RELACIONES), allowNull: false },
    tipo: { type: DataTypes.ENUM(...TIPOS_CARGA), allowNull: false },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    hasta: { type: DataTypes.DATEONLY, allowNull: true },
    documento: { type: DataTypes.STRING(100), allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "cargas_familiares",
    name: { singular: "CargaFamiliar", plural: "CargasFamiliares" }
})

// Tramo de asignación familiar de una persona desde un mes (según el documento de la CCAF o del IPS).
const TramoAsignacionPersona = sequelize.define("TramoAsignacionPersona", {
    persona_id: { type: DataTypes.INTEGER, allowNull: false },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    tramo: { type: DataTypes.ENUM(...TRAMOS), allowNull: false },
    documento: { type: DataTypes.STRING(100), allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "tramos_asignacion_persona",
    name: { singular: "TramoAsignacionPersona", plural: "TramosAsignacionPersona" },
    indexes: [{ unique: true, fields: ["persona_id", "desde"], name: "tramos_asignacion_persona_desde_unique" }]
})

module.exports = { CargaFamiliar, TramoAsignacionPersona }
