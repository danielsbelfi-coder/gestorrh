'use strict';

const MESES = [
  { vigencia_desde: "2026-10-01", vigencia_hasta: "2026-10-31" },
  { vigencia_desde: "2027-07-01", vigencia_hasta: "2027-07-31" }
]

const TRAMOS = [
  { codigo: "ASIG_FAMILIAR_TRAMO_A_HASTA", nombre: "Asignación familiar, renta máxima del tramo A", valor: 649039 },
  { codigo: "ASIG_FAMILIAR_TRAMO_B_HASTA", nombre: "Asignación familiar, renta máxima del tramo B", valor: 947990 },
  { codigo: "ASIG_FAMILIAR_TRAMO_C_HASTA", nombre: "Asignación familiar, renta máxima del tramo C", valor: 1478539 }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const filas = []

    for (const mes of MESES) {
      for (const tramo of TRAMOS) {
        filas.push({
          ...tramo,
          tipo: "monto",
          descripcion: "Límite superior (inclusive) de renta del tramo; sobre el tramo C corresponde el tramo D, sin derecho",
          fuente: "https://www.previred.com/indicadores-previsionales/",
          ...mes,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    await queryInterface.bulkInsert("parametros_legales", filas)
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: TRAMOS.map((t) => t.codigo) })
  }
};