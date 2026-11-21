const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Plantilla de jornada de una empresa. dias: los días del ciclo con { dia, trabaja, entrada, salida, colacion }
// (7 en la semanal, del lunes al domingo). Ver jornada_legal.js y «Paquete T» en el SPEC.
const Jornada = sequelize.define("Jornada", {
    empresa_id: { type: DataTypes.INTEGER, allowNull: false },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    tipo: { type: DataTypes.ENUM("semanal", "promedio", "bisemanal", "excepcional"), allowNull: false, defaultValue: "semanal" },
    dias: { type: DataTypes.JSONB, allowNull: false },
    ciclo_dias: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 7 },
    // Día 1 del ciclo (null en la semanal: el día 1 es el lunes).
    inicio_ciclo: { type: DataTypes.DATEONLY, allowNull: true },
    // Sistema excepcional (art. 38 inc. 7): resolución de la Dirección del Trabajo que lo autoriza.
    resolucion_numero: { type: DataTypes.STRING(60), allowNull: true },
    resolucion_fecha: { type: DataTypes.DATEONLY, allowNull: true },
    resolucion_vigencia_hasta: { type: DataTypes.DATEONLY, allowNull: true },
    // Promedio semanal del ciclo.
    horas_semanales: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    dias_trabajados: { type: DataTypes.DECIMAL(4, 2), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    tableName: "jornadas",
    name: { singular: "Jornada", plural: "Jornadas" },
    indexes: [{ unique: true, fields: ["empresa_id", "nombre"], name: "jornadas_empresa_nombre_unique" }]
})

module.exports = {
    Jornada
}
