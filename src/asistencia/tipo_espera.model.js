const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Tipo de espera o descanso de los turnos de conducción (art. 25), configurable por empresa. Ver «Paquete V» en el SPEC.
const TipoEspera = sequelize.define("TipoEspera", {
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    clase: { type: DataTypes.STRING(30), allowNull: false },
    imputable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pago: { type: DataTypes.ENUM("no", "por_hora", "monto_fijo"), allowNull: false, defaultValue: "no" },
    valor: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    minutos_sin_pago: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    redondeo_minutos: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1 },
    compensacion: { type: DataTypes.ENUM("dinero", "descanso"), allowNull: false, defaultValue: "dinero" },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    tableName: "tipos_espera",
    name: { singular: "TipoEspera", plural: "TiposEspera" }
})

module.exports = { TipoEspera }
