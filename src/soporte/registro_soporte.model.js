const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Una fila por cada petición de soporte a datos de clientes (aunque termine en error) y por cada restablecimiento de contraseña o de acceso.
const RegistroSoporte = sequelize.define("RegistroSoporte", {
    tipo: { type: DataTypes.ENUM("consulta", "restablecer_password", "restablecer_acceso"), allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: true },
    acceso_id: { type: DataTypes.INTEGER, allowNull: true },
    cuenta_id: { type: DataTypes.INTEGER, allowNull: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    metodo: { type: DataTypes.STRING(10), allowNull: true },
    ruta: { type: DataTypes.STRING(500), allowNull: true },
    estado_http: { type: DataTypes.INTEGER, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    detalle: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: "registro_soporte"
})

module.exports = { RegistroSoporte }
