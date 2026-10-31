'use strict';

// Registro de las liquidaciones eliminadas (todas las versiones del trabajador en el periodo, con sus líneas).
// Ver «Eliminar liquidaciones y finiquito con liquidación posterior» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("liquidaciones_eliminadas", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      periodo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "periodos_remuneracion", key: "id" }, onDelete: "CASCADE" },
      estado: { type: Sequelize.STRING(20), allowNull: false },
      datos: { type: Sequelize.JSONB, allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: true },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("liquidaciones_eliminadas", ["trabajador_id"], { name: "liquidaciones_eliminadas_trabajador" })
  },

  async down(queryInterface) {
    await queryInterface.dropTable("liquidaciones_eliminadas")
  }
};
