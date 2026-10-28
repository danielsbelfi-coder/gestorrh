'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("periodo_reaperturas", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      periodo_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "periodos_remuneracion", key: "id" } },
      usuario_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "usuarios", key: "id" } },
      motivo: { type: Sequelize.TEXT, allowNull: false },
      fecha_cierre_anterior: { type: Sequelize.DATEONLY, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable("periodo_reaperturas")
  }
};
