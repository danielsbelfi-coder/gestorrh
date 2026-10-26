'use strict';

const NUEVOS = [
  { codigo: "APORTE_SIS", nombre: "Seguro de invalidez y sobrevivencia (SIS)" },
  { codigo: "APORTE_EXPECTATIVA_VIDA", nombre: "Seguro Social: expectativa de vida" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ahora = new Date()

    await queryInterface.bulkInsert("conceptos_remuneracion", NUEVOS.map((concepto) => ({
      ...concepto,
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

    await queryInterface.bulkUpdate("conceptos_remuneracion",
      { activo: false, updatedAt: ahora },
      { empresa_id: null, codigo: "APORTE_SEGURO_SOCIAL" }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("conceptos_remuneracion", {
      empresa_id: null,
      codigo: NUEVOS.map((concepto) => concepto.codigo)
    })

    await queryInterface.bulkUpdate("conceptos_remuneracion",
      { activo: true, updatedAt: new Date() },
      { empresa_id: null, codigo: "APORTE_SEGURO_SOCIAL" }
    )
  }
};
