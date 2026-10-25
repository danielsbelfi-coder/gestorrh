'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("liquidaciones", "version", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    })

    await queryInterface.addColumn("liquidaciones", "vigente", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })

    await queryInterface.addColumn("liquidaciones", "reemplaza_a_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "liquidaciones", key: "id" }
    })

    await queryInterface.addColumn("liquidaciones", "saldo_pago_exceso", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    })

    await queryInterface.removeIndex("liquidaciones", "liquidaciones_trabajador_periodo_unique")

    await queryInterface.addIndex("liquidaciones", ["trabajador_id", "periodo_id"], {
      unique: true,
      where: { vigente: true },
      name: "liquidaciones_trabajador_periodo_vigente_unique"
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("liquidaciones", "liquidaciones_trabajador_periodo_vigente_unique")

    await queryInterface.addIndex("liquidaciones", ["trabajador_id", "periodo_id"], {
      unique: true,
      name: "liquidaciones_trabajador_periodo_unique"
    })

    await queryInterface.removeColumn("liquidaciones", "saldo_pago_exceso")
    await queryInterface.removeColumn("liquidaciones", "reemplaza_a_id")
    await queryInterface.removeColumn("liquidaciones", "vigente")
    await queryInterface.removeColumn("liquidaciones", "version")
  }
};
