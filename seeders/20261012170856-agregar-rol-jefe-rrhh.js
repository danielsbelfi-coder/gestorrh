'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert("roles", [
      {
        codigo: "JEFE_RRHH",
        nombre: "Jefe de Recursos Humanos",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  },

  async down (queryInterface, Sequelize) {
   
    await queryInterface.bulkDelete('roles', {
      codigo: "JEFE_RRHH"
    });    
  }
};
