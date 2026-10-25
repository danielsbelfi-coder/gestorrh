'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint("empresas", {
      fields: ["mutualidad_id"],
      type: "foreign key",
      name: "empresas_mutualidad_id_fkey",
      references: { table: "mutualidades", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT"
    })

    await queryInterface.addColumn("empresas", "tasa_adicional_mutual", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("empresas", "tasa_adicional_mutual")
    await queryInterface.removeConstraint("empresas", "empresas_mutualidad_id_fkey")
  }
};
