'use strict';

// Feriados legales 2026 y 2027 (fuentes públicas: calendarios de CNN Chile y Talana, contrastados entre sí).
// Los regionales y comunales: Arica y Parinacota (7 de junio) y Chillán y Chillán Viejo (20 de agosto, códigos DT 8401 y 8406).
// Soporte debe revisar y cargar cada año nuevo desde la pantalla de Feriados.
const FERIADOS = [
  { fecha: "2026-01-01", nombre: "Año Nuevo", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2026-04-03", nombre: "Viernes Santo", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-04-04", nombre: "Sábado Santo", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-05-01", nombre: "Día Nacional del Trabajo", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2026-05-21", nombre: "Día de las Glorias Navales", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-06-21", nombre: "Día Nacional de los Pueblos Indígenas", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-06-29", nombre: "San Pedro y San Pablo", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-07-16", nombre: "Día de la Virgen del Carmen", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-08-15", nombre: "Asunción de la Virgen", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-09-18", nombre: "Independencia Nacional", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2026-09-19", nombre: "Día de las Glorias del Ejército", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2026-10-12", nombre: "Encuentro de Dos Mundos", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-10-31", nombre: "Día de las Iglesias Evangélicas y Protestantes", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-11-01", nombre: "Día de Todos los Santos", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-12-08", nombre: "Inmaculada Concepción", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2026-12-25", nombre: "Navidad", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2027-01-01", nombre: "Año Nuevo", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2027-03-26", nombre: "Viernes Santo", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-03-27", nombre: "Sábado Santo", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-05-01", nombre: "Día Nacional del Trabajo", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2027-05-21", nombre: "Día de las Glorias Navales", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-06-21", nombre: "Día Nacional de los Pueblos Indígenas", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-06-28", nombre: "San Pedro y San Pablo", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-07-16", nombre: "Día de la Virgen del Carmen", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-08-15", nombre: "Asunción de la Virgen", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-09-17", nombre: "Feriado adicional de Fiestas Patrias", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-09-18", nombre: "Independencia Nacional", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2027-09-19", nombre: "Día de las Glorias del Ejército", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2027-10-11", nombre: "Encuentro de Dos Mundos", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-10-31", nombre: "Día de las Iglesias Evangélicas y Protestantes", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-11-01", nombre: "Día de Todos los Santos", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-12-08", nombre: "Inmaculada Concepción", alcance: "nacional", region: null, comuna: null, irrenunciable: false },
  { fecha: "2027-12-25", nombre: "Navidad", alcance: "nacional", region: null, comuna: null, irrenunciable: true },
  { fecha: "2026-06-07", nombre: "Asalto y Toma del Morro de Arica", alcance: "regional", region: 15, comuna: null, irrenunciable: false },
  { fecha: "2026-08-20", nombre: "Natalicio de Bernardo O'Higgins", alcance: "comunal", region: null, comuna: "8401", irrenunciable: false },
  { fecha: "2026-08-20", nombre: "Natalicio de Bernardo O'Higgins", alcance: "comunal", region: null, comuna: "8406", irrenunciable: false },
  { fecha: "2027-06-07", nombre: "Asalto y Toma del Morro de Arica", alcance: "regional", region: 15, comuna: null, irrenunciable: false },
  { fecha: "2027-08-20", nombre: "Natalicio de Bernardo O'Higgins", alcance: "comunal", region: null, comuna: "8401", irrenunciable: false },
  { fecha: "2027-08-20", nombre: "Natalicio de Bernardo O'Higgins", alcance: "comunal", region: null, comuna: "8406", irrenunciable: false }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const ahora = new Date()
    await queryInterface.sequelize.query('DELETE FROM feriados WHERE fecha BETWEEN \'2026-01-01\' AND \'2027-12-31\'')
    await queryInterface.bulkInsert("feriados", FERIADOS.map((f) => ({ ...f, createdAt: ahora, updatedAt: ahora })))
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DELETE FROM feriados WHERE fecha BETWEEN \'2026-01-01\' AND \'2027-12-31\'')
  }
};
