'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("personas", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      rut: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      dv: {
        type: Sequelize.STRING,
        allowNull: false
      },
      nombres: {
        type: Sequelize.STRING,
        allowNull: false
      },
      apellido_paterno: {
        type: Sequelize.STRING,
        allowNull: false
      },
      apellido_materno: {
        type: Sequelize.STRING,
        allowNull: true
      },
      nacionalidad: {
        type: Sequelize.STRING,
        allowNull: false
      },
      fecha_nacimiento: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      sexo_genero: {
        type: Sequelize.ENUM("masculino", "femenino"),
        allowNull: true
      },
      direccion: {
        type: Sequelize.STRING,
        allowNull: false
      },
      telefono: {
        type: Sequelize.STRING,
        allowNull: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      estado_civil: {
        type: Sequelize.STRING,
        allowNull: true
      },
      banco: {
        type: Sequelize.STRING,
        allowNull: true
      },
      tipo_cuenta: {
        type: Sequelize.ENUM("cuenta corriente", "cuenta Rut", "cuenta de ahorro", "cuenta vista"),
        allowNull: true
      },
      numero_cuenta: {
        type: Sequelize.STRING,
        allowNull: true
      },
      afp_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      sistema_salud: {
        type: Sequelize.ENUM("Fonasa", "Isapre"),
        allowNull: true
      },
      isapre_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      plan_isapre_codigo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      afiliado_afc: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("personas")
  }
};
