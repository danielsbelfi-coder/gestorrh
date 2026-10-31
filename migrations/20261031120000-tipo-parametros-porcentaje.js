'use strict';

// COTIZACION_OBLIGATORIA_AFP (10) y TASA_CESANTIA_TRABAJADOR (0,6) son porcentajes, pero se guardaron con tipo "monto".
// El cálculo no cambia (usa el valor); cambia cómo se muestran en la pantalla de parámetros y lo que se copia al abrir un mes.
// De paso se corrigen los nombres de los dos parámetros de cesantía, que quedaron en minúsculas y sin tildes.
const PORCENTAJES = ["COTIZACION_OBLIGATORIA_AFP", "TASA_CESANTIA_TRABAJADOR"]
const NOMBRES = [
  { codigo: "TASA_CESANTIA_TRABAJADOR", nuevo: "Seguro de cesantía, cotización del trabajador", anterior: "tasa Seguro de cesantia del trabajador" },
  { codigo: "TOPE_CESANTIA_UF", nuevo: "Tope imponible seguro de cesantía (UF)", anterior: "tope en uf seguro de cesantia" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate("parametros_legales", { tipo: "porcentaje" }, { codigo: PORCENTAJES })
    for (const { codigo, nuevo, anterior } of NOMBRES) {
      await queryInterface.bulkUpdate("parametros_legales", { nombre: nuevo }, { codigo, nombre: anterior })
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate("parametros_legales", { tipo: "monto" }, { codigo: PORCENTAJES })
    for (const { codigo, nuevo, anterior } of NOMBRES) {
      await queryInterface.bulkUpdate("parametros_legales", { nombre: anterior }, { codigo, nombre: nuevo })
    }
  }
};
