'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" RENAME VALUE 'permiso' TO 'permiso_sin_goce';`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" ADD VALUE 'permiso_con_goce';`)
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`UPDATE asistencias SET tipo = 'permiso_sin_goce' WHERE tipo = 'permiso_con_goce';`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" RENAME VALUE 'permiso_sin_goce' TO 'permiso';`)
  }
};
