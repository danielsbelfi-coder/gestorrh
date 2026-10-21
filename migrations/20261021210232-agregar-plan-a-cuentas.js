'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn("cuentas", "plan_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "planes",
        key: "id"
      }
    }
    )

    await queryInterface.addColumn("cuentas", "usuarios_adicionales", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("cuentas", "usuarios_adicionales")
    await queryInterface.removeColumn("cuentas", "plan_id")
  }
};