const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Turno de conducción (art. 25): marcaciones de inicio y fin y sus esperas o descansos. El turno entero se imputa a
// la fecha en que empieza. Ver calculo_turnos.js y «Paquete V» en el SPEC.
const TurnoConduccion = sequelize.define("TurnoConduccion", {
    trabajador_id: { type: DataTypes.INTEGER, allowNull: false },
    fecha: { type: DataTypes.DATEONLY, allowNull: false },
    hora_inicio: { type: DataTypes.STRING(5), allowNull: false },
    hora_fin: { type: DataTypes.STRING(5), allowNull: false },
    servicio: { type: DataTypes.STRING(120), allowNull: true },
    pausas: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    fuente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "manual" },
    observaciones: { type: DataTypes.STRING(300), allowNull: true },
    estado_aprobacion: { type: DataTypes.ENUM("pendiente", "aprobado"), allowNull: false, defaultValue: "pendiente" },
    usuario_registro_id: { type: DataTypes.INTEGER, allowNull: false },
    aprobado_por_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: "turnos_conduccion",
    name: { singular: "TurnoConduccion", plural: "TurnosConduccion" }
})

module.exports = { TurnoConduccion }
