'use strict';

const CODIGOS = {
  afps: { CUPRUM: "03", HABITAT: "05", PROVIDA: "08", PLANVITAL: "29", CAPITAL: "33", MODELO: "34", UNO: "35" },
  isapres: { BANMEDICA: "01", CONSALUD: "02", VIDATRES: "03", COLMENA: "04", CRUZBLANCA: "05", MASVIDA: "10" },
  mutualidades: { ISL: "00", ACHS: "01", MUTUAL_CCHC: "02", IST: "03" }
}

const ISAPRES_NUEVAS = [
  { codigo: "ISALUD", nombre: "Isapre Isalud", codigo_previred: "11" },
  { codigo: "FUNDACION", nombre: "Isapre Fundación", codigo_previred: "12" },
  { codigo: "CRUZDELNORTE", nombre: "Isapre Cruz del Norte", codigo_previred: "25" },
  { codigo: "ESENCIAL", nombre: "Isapre Esencial", codigo_previred: "28" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [tabla, porCodigo] of Object.entries(CODIGOS)) {
      for (const [codigo, codigoPrevired] of Object.entries(porCodigo)) {
        await queryInterface.bulkUpdate(tabla, { codigo_previred: codigoPrevired }, { codigo })
      }
    }

    await queryInterface.bulkInsert("isapres", ISAPRES_NUEVAS.map((isapre) => ({
      ...isapre,
      estado: "activo",
      createdAt: new Date(),
      updatedAt: new Date()
    })))
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("isapres", { codigo: ISAPRES_NUEVAS.map((isapre) => isapre.codigo) })

    for (const tabla of Object.keys(CODIGOS)) {
      await queryInterface.bulkUpdate(tabla, { codigo_previred: null }, {})
    }
  }
};
