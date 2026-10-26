'use strict';

const FUENTE = "https://www.previred.com/indicadores-previsionales/"

const MESES = [
  { vigencia_desde: "2026-10-01", vigencia_hasta: "2026-10-31" },
  { vigencia_desde: "2027-07-01", vigencia_hasta: "2027-07-31" }
]

const NUEVOS = [
  {
    codigo: "TASA_SIS", nombre: "Seguro Social: SIS", valor: 1.78,
    descripcion: "Seguro de invalidez y sobrevivencia, cargo del empleador; parte del 2,5% del Seguro Social"
  },
  {
    codigo: "TASA_EXPECTATIVA_VIDA", nombre: "Seguro Social: expectativa de vida", valor: 0.72,
    descripcion: "Compensación por expectativa de vida, cargo del empleador; parte del 2,5% del Seguro Social"
  }
]

function filas(lista) {
  return MESES.flatMap((mes) => lista.map((parametro) => ({
    ...parametro,
    ...mes,
    tipo: "porcentaje",
    fuente: FUENTE,
    createdAt: new Date(),
    updatedAt: new Date()
  })))
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", filas(NUEVOS))
    await queryInterface.bulkDelete("parametros_legales", { codigo: "SEGURO_SOCIAL_PREVISIONAL" })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: NUEVOS.map((p) => p.codigo) })
    await queryInterface.bulkInsert("parametros_legales", filas([
      {
        codigo: "SEGURO_SOCIAL_PREVISIONAL", nombre: "Reforma: Seguro Social Previsional", valor: 2.5,
        descripcion: "Incluye el SIS y la compensación por expectativa de vida"
      }
    ]))
  }
};