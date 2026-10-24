'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("resumenes_asistencia", {
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
      dias_inasistencia: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      dias_licencia_medica: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      dias_permiso_sin_goce: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      dias_vacaciones: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      minutos_atraso: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      estado: {
        type: Sequelize.ENUM("pendiente", "aprobado"),
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

    await queryInterface.addIndex("resumenes_asistencia", ["periodo_id", "trabajador_id"], {
      unique: true,
      name: "resumenes_asistencia_periodo_trabajador_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("resumenes_asistencia")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_resumenes_asistencia_estado";')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_resumenes_asistencia_fuente";')
  }
};
