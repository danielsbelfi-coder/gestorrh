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
  comuna: {
    type: DataTypes.STRING(5),
    allowNull: true
  },
  tipo_empleador:
  {
    type: DataTypes.ENUM("juridica", "natural"),
    allowNull: false,
    defaultValue: "juridica"
  },
  nombres: {
    type: DataTypes.STRING,
    allowNull: true
  },
  apellido_paterno: {
    type: DataTypes.STRING,
    allowNull: true
  },
  apellido_materno: {
    type: DataTypes.STRING,
    allowNull: true
  },
  giro: {
    type: DataTypes.STRING,
    allowNull: true
  },
  codigo_actividad: {
    type: DataTypes.STRING(6),
    allowNull: true
  },
  telefono: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  representante_legal_email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ccaf: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  ccaf_agencia: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ccaf_numero_socio: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  mutualidad_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  tasa_adicional_mutual: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
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
  // DJ 1887: los meses se informan con código A/B (agrícola) en vez de C/P.
  es_agricola: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
}, {
  tableName: "empresas"
})

module.exports = {
  Empresa
}