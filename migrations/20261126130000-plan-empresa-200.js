'use strict';

// Cuarto plan: hasta 200 trabajadores. Va como migración (no como seeder) para que llegue a la base de la nube con
// db:migrate. Precio de PRUEBA, como los otros tres (los reales se definen después de cotizar).
const PLAN = {
  nombre: "plan_empresa",
  nombre_visible: "Empresa (prueba)",
  max_trabajadores: 200,
  usuarios_incluidos: 12,
  precio_uf: 5.6,
  precio_usuario_adicional_uf: 0.1
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existentes] = await queryInterface.sequelize.query("SELECT id FROM planes WHERE nombre = :nombre", { replacements: { nombre: PLAN.nombre } })
    if (existentes.length > 0) {
      return
    }
    const ahora = new Date()
    await queryInterface.bulkInsert("planes", [{ ...PLAN, activo: true, createdAt: ahora, updatedAt: ahora }])
  },

  async down(queryInterface) {
    const [enUso] = await queryInterface.sequelize.query(
      "SELECT c.id FROM cuentas c JOIN planes p ON p.id = c.plan_id WHERE p.nombre = :nombre", { replacements: { nombre: PLAN.nombre } })
    if (enUso.length > 0) {
      throw new Error(`Hay ${enUso.length} cuenta(s) con el plan ${PLAN.nombre}: cámbielas de plan antes de revertir`)
    }
    await queryInterface.bulkDelete("planes", { nombre: PLAN.nombre })
  }
};
