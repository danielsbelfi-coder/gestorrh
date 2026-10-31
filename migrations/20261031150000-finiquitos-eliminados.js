'use strict';

// Registro de los finiquitos eliminados (calculados o emitidos, nunca pagados). Ver «Finiquito: saldo desactualizado
// y eliminación» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("finiquitos_eliminados", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      trabajador_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "trabajadores", key: "id" }, onDelete: "CASCADE" },
      finiquito_id: { type: Sequelize.INTEGER, allowNull: false },
      estado: { type: Sequelize.STRING(20), allowNull: false },
      datos: { type: Sequelize.JSONB, allowNull: false },
      motivo: { type: Sequelize.TEXT, allowNull: true },
      quito_termino: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      usuario_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("finiquitos_eliminados", ["trabajador_id"], { name: "finiquitos_eliminados_trabajador" })
  },

  async down(queryInterface) {
    await queryInterface.dropTable("finiquitos_eliminados")
  }
};
