'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("roles", [
      {
        codigo: "ADMIN",
        nombre: "Administrador",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "RRHH",
        nombre: "Recursos Humanos",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "SUPERVISOR",
        nombre: "Supervisor",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "LECTURA",
        nombre: "Solo lectura",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("roles", { codigo: [ "ADMIN", "RRHH", "SUPERVISOR", "LECTURA" ] })

  }
};
