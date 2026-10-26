'use strict';

const APORTES = [
  { codigo: "APORTE_CESANTIA", nombre: "Seguro de cesantía empleador" },
  { codigo: "APORTE_MUTUAL", nombre: "Mutualidad Ley 16.744" },
  { codigo: "APORTE_SANNA", nombre: "Ley SANNA" },
  { codigo: "APORTE_SEGURO_SOCIAL", nombre: "Seguro Social Previsional" },
  { codigo: "APORTE_CUENTA_INDIVIDUAL", nombre: "Reforma: cuenta individual" },
  { codigo: "APORTE_RENTABILIDAD_PROTEGIDA", nombre: "Reforma: rentabilidad protegida" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ahora = new Date()

    await queryInterface.bulkInsert("conceptos_remuneracion", APORTES.map((aporte) => ({
      ...aporte,
      empresa_id: null,
      tipo: "aporte_empleador",
      imponible: false,
      tributable: false,
      base_gratificacion: false,
      recargo_hora_extra: null,
      calculado_por_sistema: true,
      codigo_lre: null,
      activo: true,
      createdAt: ahora,
      updatedAt: ahora
    })))
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("conceptos_remuneracion", {
      empresa_id: null,
      codigo: APORTES.map((aporte) => aporte.codigo)
    })
  }
};
