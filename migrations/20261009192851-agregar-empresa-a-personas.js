'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Crear la columna, todavía opcional, con llave foránea a empresas
    await queryInterface.addColumn("personas", "empresa_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "empresas", key: "id" }
    })

    // 2. Copiar la empresa desde el trabajador de cada persona
    await queryInterface.sequelize.query(`
      UPDATE personas SET empresa_id = trabajadores.empresa_id
      FROM trabajadores
      WHERE trabajadores.persona_id = personas.id
    `)

    // 3. Las personas sin trabajador (4, 9, 10 y 12) quedan en la empresa 1
    await queryInterface.sequelize.query(`
      UPDATE personas SET empresa_id = 1 WHERE empresa_id IS NULL
    `)

    // 4. Ahora que todas tienen empresa, la columna pasa a ser obligatoria
    await queryInterface.changeColumn("personas", "empresa_id", {
      type: Sequelize.INTEGER,
      allowNull: false
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("personas", "empresa_id")
  }
};
