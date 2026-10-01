'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("empresas", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      rut: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      razon_social: {
        type: Sequelize.STRING,
        allowNull: false
      },
      nombre_fantasia: {
        type: Sequelize.STRING,
        allowNull: true
      },
      representante_legal_nombre: {
        type: Sequelize.STRING,
        allowNull: false
      },
      representante_legal_rut: {
        type: Sequelize.STRING,
        allowNull: false
      },
      direccion: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mutualidad_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      estado: {
        type: Sequelize.ENUM("activa", "inactiva"),
        defaultValue: "activa"
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
    await queryInterface.dropTable("empresas")
  }
};
