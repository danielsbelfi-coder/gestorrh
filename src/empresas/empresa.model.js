const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Empresa = sequelize.define("Empresa", {
  rut: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dv: {
    type: DataTypes.STRING(1),
    allowNull: false
  },
  razon_social: {
    type: DataTypes.STRING,
    allowNull: false
  },
  nombre_fantasia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  representante_legal_nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  representante_legal_rut: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mutualidad_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  estado: {
    type: DataTypes.ENUM("activa", "inactiva"),
    defaultValue: "activa"
  },
  cuenta_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha_desactivacion: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
}, {
  tableName: "empresas"
})

module.exports = {
  Empresa
}