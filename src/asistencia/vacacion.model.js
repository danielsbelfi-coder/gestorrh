const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Solicitud de vacaciones (feriado anual) de una relación laboral. Al aprobarse genera las marcas del libro.
const Vacacion = sequelize.define("Vacacion", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false },
    desde: { type: DataTypes.DATEONLY, allowNull: false },
    hasta: { type: DataTypes.DATEONLY, allowNull: false },
    dias_habiles: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.ENUM("pendiente", "aprobada", "rechazada", "anulada"), allowNull: false, defaultValue: "pendiente" },
    anticipadas: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    observaciones: { type: DataTypes.TEXT, allowNull: true },
    motivo: { type: DataTypes.TEXT, allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: false },
    aprobado_por_id: { type: DataTypes.INTEGER, allowNull: true },
    fecha_aprobacion: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: "vacaciones",
    name: { singular: "Vacacion", plural: "Vacaciones" }
})

// Días pendientes de períodos ya cumplidos a una fecha de corte (trabajadores que vienen de antes de GestorRH).
const VacacionSaldoInicial = sequelize.define("VacacionSaldoInicial", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    fecha_corte: { type: DataTypes.DATEONLY, allowNull: false },
    dias: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
    documento: { type: DataTypes.STRING(200), allowNull: true },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
    tableName: "vacaciones_saldo_inicial",
    name: { singular: "VacacionSaldoInicial", plural: "VacacionesSaldoInicial" }
})

module.exports = { Vacacion, VacacionSaldoInicial }
