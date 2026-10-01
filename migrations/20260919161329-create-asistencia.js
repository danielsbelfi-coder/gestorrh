'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("asistencias", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      trabajador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "trabajadores",
          key: "id"
        }
      },
      fecha: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      hora_entrada: {
        type: Sequelize.TIME,
        allowNull: true
      },
      hora_salida: {
        type: Sequelize.TIME,
        allowNull: true
      },
      tipo: {
        type: Sequelize.ENUM(
          "normal",
          "atraso",
          "inasistencia",
          "permiso",
          "vacaciones",
          "licencia_medica"
        ),
        allowNull: false
      },
      fuente: {
        type: Sequelize.ENUM(
          "manual",
          "geovictoria",
          "importado_csv",
          "otro"
        ),
        defaultValue: "manual",
        allowNull: false
      },
      observaciones: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      usuario_registro_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "usuarios",
          key: "id"
        }
      },
      estado_aprobacion: {
        type: Sequelize.ENUM(
          "pendiente", "aprobada", "rechazada"
        ),
        defaultValue: "pendiente",
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
    await queryInterface.dropTable("asistencias")
  }
};
