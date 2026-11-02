'use strict';

// Módulo de vacaciones, parte 1: solicitudes con aprobación, saldo inicial a una fecha de corte y marcas del libro
// generadas por las vacaciones aprobadas. Ver «Módulo de vacaciones, parte 1» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("vacaciones", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      hasta: { type: Sequelize.DATEONLY, allowNull: false },
      dias_habiles: { type: Sequelize.INTEGER, allowNull: false },
      estado: { type: Sequelize.ENUM("pendiente", "aprobada", "rechazada", "anulada"), allowNull: false, defaultValue: "pendiente" },
      anticipadas: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      observaciones: { type: Sequelize.TEXT, allowNull: true },
      motivo: { type: Sequelize.TEXT, allowNull: true },
      usuario_registro_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
      aprobado_por_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      fecha_aprobacion: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("vacaciones", ["trabajador_id", "desde"], { name: "vacaciones_trabajador_desde" })

    await queryInterface.createTable("vacaciones_saldo_inicial", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      fecha_corte: { type: Sequelize.DATEONLY, allowNull: false },
      dias: { type: Sequelize.DECIMAL(6, 2), allowNull: false },
      documento: { type: Sequelize.STRING(200), allowNull: true },
      usuario_registro_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })

    await queryInterface.addColumn("asistencias", "vacacion_id", { type: Sequelize.INTEGER, allowNull: true, references: { model: "vacaciones", key: "id" }, onDelete: "CASCADE" })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("asistencias", "vacacion_id")
    await queryInterface.dropTable("vacaciones_saldo_inicial")
    await queryInterface.dropTable("vacaciones")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_vacaciones_estado"')
  }
};
