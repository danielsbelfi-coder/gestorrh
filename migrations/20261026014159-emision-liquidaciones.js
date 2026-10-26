'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("liquidaciones", "fecha_emision", {
      type: Sequelize.DATE,
      allowNull: true
    })

    await queryInterface.addColumn("liquidaciones", "emitido_por_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "usuarios", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("liquidaciones", "emitido_por_id")
    await queryInterface.removeColumn("liquidaciones", "fecha_emision")
  }
};