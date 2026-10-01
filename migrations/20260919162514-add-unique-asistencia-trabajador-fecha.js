'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("asistencias", ["trabajador_id", "fecha"], {
      unique: true,
      name: "asistencias_trabajador_id_fecha_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("asistencias", "asistencias_trabajador_id_fecha_unique")
  }
};