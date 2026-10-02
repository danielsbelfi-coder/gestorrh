'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert("afps", [
      {
        codigo: "CAPITAL",
        nombre: "AFP Capital",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "CUPRUM",
        nombre: "AFP Cuprum",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "HABITAT",
        nombre: "AFP Habitat",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "MODELO",
        nombre: "AFP Modelo",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "PLANVITAL",
        nombre: "AFP PlanVital",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "PROVIDA",
        nombre: "AFP ProVida",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UNO",
        nombre: "AFP Uno",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ])
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete("afps", { codigo: [ "CAPITAL", "CUPRUM", "HABITAT", "MODELO", "PLANVITAL", "PROVIDA", "UNO" ] })
  }
};
