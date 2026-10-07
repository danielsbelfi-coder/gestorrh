'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "INGRESO_MINIMO_MENSUAL",
        nombre: "Ingreso mínimo mensual (trabajadores de 18 a 65 años)",
        tipo: "monto",
        descripcion: "$539.000 desde el 1 de enero de 2026, Ley N° 21.751",
        valor: 539000,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: null,
        fuente: "https://www.mintrab.gob.cl/reajuste-al-ingreso-minimo-mensual/",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", {codigo: "INGRESO_MINIMO_MENSUAL"} )
  }
};