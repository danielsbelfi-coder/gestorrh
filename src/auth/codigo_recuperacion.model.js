const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

// Códigos de recuperación del 2FA. Se guarda solo el hash (SHA-256) y la fecha en que se usó cada uno.
const CodigoRecuperacion = sequelize.define("CodigoRecuperacion", {
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    codigo_hash: { type: DataTypes.STRING(64), allowNull: false },
    usado_en: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: "codigos_recuperacion",
    name: { singular: "CodigoRecuperacion", plural: "CodigosRecuperacion" }
})

module.exports = { CodigoRecuperacion }
