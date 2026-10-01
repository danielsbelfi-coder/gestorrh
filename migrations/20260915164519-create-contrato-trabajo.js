'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("contratos_trabajo", {
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
      tipo_contrato: {
        type: Sequelize.ENUM("indefinido", "plazo_fijo", "obra_faena"),
        allowNull: false
      },
      fecha_inicio: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      fecha_termino: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      causal_plazo_fijo: {
        type: Sequelize.STRING,
        allowNull: true
      },
      obra_faena_descripcion: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cargo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "cargos",
          key: "id"
        }
      },
      funciones: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      lugar_prestacion_servicios: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipo_jornada: {
        type: Sequelize.ENUM("completa", "parcial", "excluido_limitacion"),
        allowNull: false
      },
      horas_semanales: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      dias_trabajados: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sistema_remuneracion: {
        type: Sequelize.ENUM("mensual", "diario", "semanal", "hora"),
        allowNull: false
      },
      sueldo_base: {
        type: Sequelize.DECIMAL,
        allowNull: false
      },
      periodicidad_pago: {
        type: Sequelize.ENUM("mensual", "quincenal", "semanal"),
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
      estado: {
        type: Sequelize.ENUM("vigente", "terminado", "anulado"),
        defaultValue: "vigente"
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

    await queryInterface.dropTable("contratos_trabajo")
  }
};