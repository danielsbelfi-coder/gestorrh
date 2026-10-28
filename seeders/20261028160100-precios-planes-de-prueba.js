'use strict';

// Precios de PRUEBA para los planes de prueba (los reales se definen después de cotizar).
const PRECIOS = [
  { nombre: "plan_basico", nombre_visible: "Básico (prueba)", precio_uf: 1.0, precio_usuario_adicional_uf: 0.15 },
  { nombre: "plan_pyme", nombre_visible: "Pyme (prueba)", precio_uf: 1.8, precio_usuario_adicional_uf: 0.15 },
  { nombre: "plan_pro", nombre_visible: "Pro (prueba)", precio_uf: 3.2, precio_usuario_adicional_uf: 0.12 }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const { nombre, ...valores } of PRECIOS) {
      await queryInterface.bulkUpdate("planes", { ...valores, updatedAt: new Date() }, { nombre })
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate("planes",
      { nombre_visible: null, precio_uf: 0, precio_usuario_adicional_uf: 0 },
      { nombre: PRECIOS.map((p) => p.nombre) })
  }
};
