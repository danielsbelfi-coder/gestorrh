'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("variables_periodo", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      periodo_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "periodos_remuneracion", key: "id" }
      },
      trabajador_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "trabajadores", key: "id" }
      },
      concepto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "conceptos_remuneracion", key: "id" }
      },
      cantidad: {
        type: Sequelize.DECIMAL(8, 2),
        allowNull: true
      },
      monto: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      glosa: {
        type: Sequelize.STRING,
        allowNull: true
      },
      estado: {
        type: Sequelize.ENUM("pendiente", "aprobada"),
        allowNull: false,
        defaultValue: "pendiente"
      },
      fuente: {
        type: Sequelize.ENUM("manual", "asistencia", "importacion"),
        allowNull: false,
        defaultValue: "manual"
      },
      usuario_registro_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "usuarios", key: "id" }
      },
      aprobado_por_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" }
      },
      fecha_aprobacion: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex("variables_periodo", ["periodo_id", "trabajador_id"], {
      name: "variables_periodo_periodo_trabajador"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("variables_periodo")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_variables_periodo_estado";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_variables_periodo_fuente";')
  }
};
