'use strict';
const { limpiarRut, calcularDv } = require("../src/shared/rut.js")

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Leer todas las personas
    const [personas] = await queryInterface.sequelize.query(
      "SELECT id, rut FROM personas"
    )

    // 2. Para cada una: limpiar el RUT, recalcular el DV y guardar
    for (const persona of personas) {
      const rut = limpiarRut(persona.rut)
      const dv = calcularDv(rut)

      await queryInterface.sequelize.query(
        "UPDATE personas SET rut = :rut, dv = :dv WHERE id = :id",
        { replacements: { rut: rut, dv: dv, id: persona.id } }
      )
    }
  },

  async down (queryInterface, Sequelize) {
    // Irreversible: el formato original de cada RUT no se guarda en ninguna parte
  }
};
