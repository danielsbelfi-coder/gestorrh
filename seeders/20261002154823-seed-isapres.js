'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("isapres", [
      {
        codigo: "BANMEDICA",
        nombre: "Isapre Banmedica",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "COLMENA",
        nombre: "Isapre Colmena Golden Cross",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "CONSALUD",
        nombre: "Isapre Consalud",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "CRUZBLANCA",
        nombre: "Isapre Cruz Blanca",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "MASVIDA",
        nombre: "Isapre Nueva Masvida",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "VIDATRES",
        nombre: "Isapre Vida Tres",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("isapres", { codigo: ["BANMEDICA", "COLMENA", "CONSALUD", "CRUZBLANCA", "MASVIDA", "VIDATRES"] })
  }
};
