'use strict';

const FECHA_CIERRE = "2026-10-31"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE parametros_legales SET vigencia_hasta = :fecha WHERE vigencia_hasta IS NULL`,
      { replacements: { fecha: FECHA_CIERRE } }
    )
    await queryInterface.sequelize.query(
      `UPDATE tramos_impuesto SET vigencia_hasta = :fecha WHERE vigencia_hasta IS NULL`,
      { replacements: { fecha: FECHA_CIERRE } }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE parametros_legales SET vigencia_hasta = NULL WHERE vigencia_hasta = :fecha AND codigo <> 'UTM'`,
      { replacements: { fecha: FECHA_CIERRE } }
    )
    await queryInterface.sequelize.query(
      `UPDATE tramos_impuesto SET vigencia_hasta = NULL WHERE vigencia_hasta = :fecha`,
      { replacements: { fecha: FECHA_CIERRE } }
    )
  }
};
