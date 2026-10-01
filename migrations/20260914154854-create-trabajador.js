'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("trabajadores", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      persona_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "personas",
          key: "id"
        }
      },
      empresa_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "empresas",
          key: "id"
        }
      },
      fecha_ingreso: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_termino: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      estado: {
        type: Sequelize.ENUM(
          "postulante",
          "activo",
          "suspendido",
          "con_licencia",
          "desvinculado",
          "historico"),
        defaultValue: "postulante"
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("trabajadores")
  }
};