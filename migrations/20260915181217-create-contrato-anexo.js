'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("contratos_anexo", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      contrato_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "contratos_trabajo",
          key: "id"
        }
      },
      fecha_vigencia: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      campo_modificado: {
        type: Sequelize.STRING,
        allowNull: false
      },
      valor_anterior: {
        type: Sequelize.STRING,
        allowNull: false
      },
      valor_nuevo: {
        type: Sequelize.STRING,
        allowNull: false
      },
      motivo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      estado_firma: {
        type: Sequelize.ENUM("pendiente", "firmado", "rechazado"),
        defaultValue: "pendiente"
      },
      fecha_firma: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      usuario_creo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "usuarios",
          key: "id"
        }
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
    await queryInterface.dropTable("contratos_anexo")
  }
};