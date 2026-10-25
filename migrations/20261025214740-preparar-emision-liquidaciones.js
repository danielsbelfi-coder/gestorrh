'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_liquidaciones_estado" RENAME VALUE 'cerrada' TO 'emitida';`)

    await queryInterface.addColumn("liquidaciones", "motivo_version", {
      type: Sequelize.TEXT,
      allowNull: true
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("liquidaciones", "motivo_version")

    await queryInterface.sequelize.query(`ALTER TYPE "enum_liquidaciones_estado" RENAME VALUE 'emitida' TO 'cerrada';`)
  }
};
