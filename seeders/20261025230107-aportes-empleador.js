'use strict';

const REFORMA = "https://previsionsocial.gob.cl/wp-content/uploads/2025/08/Nota-Tecnica-Reforma-de-Pensiones-Ley-N%C2%B021.735.pdf"
const COTIZACIONES = "https://previsionsocial.gob.cl/organizaciones/empresas-y-empleadores-empleadoras/cotizaciones-previsionales/"

const TASAS = [
  { codigo: "MUTUAL_TASA_BASICA", nombre: "Cotización básica Ley 16.744", valor: 0.9, fuente: COTIZACIONES,
    descripcion: "Tasa básica del seguro de accidentes; se suma la adicional de cada empresa" },
  { codigo: "LEY_SANNA", nombre: "Cotización Ley SANNA", valor: 0.03, fuente: COTIZACIONES,
    descripcion: "Sobre la base imponible del SIS; se paga junto con la mutualidad" },
  { codigo: "CESANTIA_EMPLEADOR_INDEFINIDO", nombre: "Cesantía empleador, contrato indefinido", valor: 2.4, fuente: COTIZACIONES,
    descripcion: "Se mantiene después de 11 años; cambia solo el destino" },
  { codigo: "CESANTIA_EMPLEADOR_PLAZO_FIJO", nombre: "Cesantía empleador, plazo fijo u obra", valor: 3.0, fuente: COTIZACIONES,
    descripcion: "Íntegra a la cuenta individual de cesantía" },
  { codigo: "REFORMA_CUENTA_INDIVIDUAL", nombre: "Reforma: aporte a cuenta individual", valor: 0.1, fuente: REFORMA,
    descripcion: "Ley 21.735, tramo desde agosto 2026" },
  { codigo: "REFORMA_RENTABILIDAD_PROTEGIDA", nombre: "Reforma: cotización con rentabilidad protegida", valor: 0.9, fuente: REFORMA,
    descripcion: "Ley 21.735, tramo desde agosto 2026" },
  { codigo: "SEGURO_SOCIAL_PREVISIONAL", nombre: "Reforma: Seguro Social Previsional", valor: 2.5, fuente: REFORMA,
    descripcion: "Incluye el SIS y la compensación por expectativa de vida" }
]

const MESES = [
  { vigencia_desde: "2026-10-01", vigencia_hasta: "2026-10-31" },
  { vigencia_desde: "2027-07-01", vigencia_hasta: "2027-07-31" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const filas = MESES.flatMap((mes) => TASAS.map((tasa) => ({
      ...tasa,
      ...mes,
      tipo: "porcentaje",
      createdAt: new Date(),
      updatedAt: new Date()
    })))

    await queryInterface.bulkInsert("parametros_legales", filas)
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales", {
      codigo: TASAS.map((tasa) => tasa.codigo)
    })
  }
};
