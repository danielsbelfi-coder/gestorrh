'use strict';

const MUTUALIDADES = [
  { codigo: "ISL", nombre: "Instituto de Seguridad Laboral" },
  { codigo: "ACHS", nombre: "Asociación Chilena de Seguridad" },
  { codigo: "MUTUAL_CCHC", nombre: "Mutual de Seguridad CChC" },
  { codigo: "IST", nombre: "Instituto de Seguridad del Trabajo" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("mutualidades", MUTUALIDADES.map((m) => ({
      ...m,
      createdAt: new Date(),
      updatedAt: new Date()
    })))
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("mutualidades", {
      codigo: MUTUALIDADES.map((m) => m.codigo)
    })
  }
};
