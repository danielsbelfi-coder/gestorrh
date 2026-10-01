'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("asistencia_correcciones", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      asistencia_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "asistencias",
          key: "id"
        }
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
      estado_aprobacion: {
        type: Sequelize.ENUM(
          "pendiente",
          "aprobada",
          "rechazada"
        ),
        defaultValue: "pendiente"
      },
      usuario_solicito_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "usuarios",
          key: "id"
        }
      },
      aprobado_por_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "usuarios",
          key: "id"
        }
      },
      fecha_aprobacion: {
        type: Sequelize.DATEONLY,
        allowNull: true
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
    await queryInterface.dropTable("asistencia_correcciones")
  }
}
