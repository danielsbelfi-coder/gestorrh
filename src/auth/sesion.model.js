const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Una fila por sesión abierta. La cookie lleva un identificador aleatorio y aquí se guarda solo su hash:
// con una copia de la base no se puede entrar. Cerrar sesión = borrar la fila.
const Sesion = sequelize.define("Sesion", {
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    csrf_token: { type: DataTypes.STRING(64), allowNull: false },
    estado: { type: DataTypes.ENUM("pendiente_2fa", "activa"), allowNull: false },
    expira_en: { type: DataTypes.DATE, allowNull: false },
    ultimo_uso_en: { type: DataTypes.DATE, allowNull: false },
    ip: { type: DataTypes.STRING(64), allowNull: true },
    navegador: { type: DataTypes.STRING(255), allowNull: true }
}, {
    tableName: "sesiones",
    name: { singular: "Sesion", plural: "Sesiones" }
})

module.exports = { Sesion }
