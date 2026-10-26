'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_conceptos_remuneracion_tipo" ADD VALUE IF NOT EXISTS 'aporte_empleador';`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_liquidacion_lineas_tipo" ADD VALUE IF NOT EXISTS 'aporte_empleador';`)
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL no permite quitar un valor de un enum; el valor queda sin uso.
  }
};
