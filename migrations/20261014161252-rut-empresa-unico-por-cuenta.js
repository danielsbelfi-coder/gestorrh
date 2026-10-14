'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeConstraint("empresas", "empresas_rut_key");
    await queryInterface.addIndex("empresas", ["cuenta_id", "rut"], {
      unique: true,
      name: "empresas_cuenta_rut_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("empresas", "empresas_cuenta_rut_unique")

    await queryInterface.addConstraint("empresas", {
      fields: ["rut"],
      type: "unique",
      name: "empresas_rut_key"
    })
  }
};
