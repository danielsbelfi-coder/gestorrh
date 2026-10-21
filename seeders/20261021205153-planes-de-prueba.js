'use strict';

const PLANES = [
  { nombre: "plan_basico", max_trabajadores: 25, usuarios_incluidos: 3 },
  { nombre: "plan_pyme", max_trabajadores: 50, usuarios_incluidos: 5 },
  { nombre: "plan_pro", max_trabajadores: 100, usuarios_incluidos: 8 }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ahora = new Date()

    await queryInterface.bulkInsert("planes", PLANES.map((plan) => ({
      ...plan,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora
    })))
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("planes", { nombre: PLANES.map((plan) => plan.nombre) })
  }
};
