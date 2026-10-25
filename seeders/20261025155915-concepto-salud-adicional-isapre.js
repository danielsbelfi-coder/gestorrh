'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ahora = new Date()

    await queryInterface.bulkInsert("conceptos_remuneracion", [{
      empresa_id: null,
      codigo: "SALUD_ADICIONAL_ISAPRE",
      nombre: "Adicional Isapre",
      tipo: "descuento",
      imponible: false,
      tributable: false,
      base_gratificacion: false,
      recargo_hora_extra: null,
      calculado_por_sistema: true,
      codigo_lre: null,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora
    }])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("conceptos_remuneracion", {
      empresa_id: null,
      codigo: "SALUD_ADICIONAL_ISAPRE"
    })
  }
};