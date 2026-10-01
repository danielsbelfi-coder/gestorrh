const { DataTypes } = require("sequelize")
const { sequelize } = require("../shared/database.js")

const Persona = sequelize.define("Persona", {
    rut: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    dv: {
        type: DataTypes.STRING,
        allowNull: false
    },
    nombres: {
        type: DataTypes.STRING,
        allowNull: false
    },
    apellido_paterno: {
        type: DataTypes.STRING,
        allowNull: false
    },
    apellido_materno: {
        type: DataTypes.STRING,
        allowNull: true
    },
    nacionalidad: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha_nacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    sexo_genero: {
        type: DataTypes.ENUM("masculino", "femenino"),
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING,
        allowNull: false
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    estado_civil: {
        type: DataTypes.STRING,
        allowNull: true
    },
    banco: {
        type: DataTypes.STRING,
        allowNull: true
    },
    tipo_cuenta: {
        type: DataTypes.ENUM("cuenta corriente", "cuenta Rut", "cuenta de ahorro", "cuenta vista"),
        allowNull: true
    },
    numero_cuenta: {
        type: DataTypes.STRING,
        allowNull: true
    },
    afp_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sistema_salud: {
        type: DataTypes.ENUM("Fonasa", "Isapre"),
        allowNull: true
    },
    isapre_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    plan_isapre_codigo: {
        type: DataTypes.STRING,
        allowNull: true
    },
    afiliado_afc: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
}, {
    tableName: "personas"
}
)

module.exports = {
    Persona
}