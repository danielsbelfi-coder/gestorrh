'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // 1. Quitar la restricción que hace el RUT único en todo el sistema
    await queryInterface.removeConstraint("personas", "personas_rut_key")

    // 2. Crear el índice único por empresa: el mismo RUT puede existir en empresas distintas
    await queryInterface.addIndex("personas", ["empresa_id", "rut"], {
      unique: true,
      name: "personas_empresa_rut_unique"
    })
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex("personas", "personas_empresa_rut_unique")

    await queryInterface.addConstraint("personas", {
      fields: ["rut"],
      type: "unique",
      name: "personas_rut_key"
    })
  }
};
