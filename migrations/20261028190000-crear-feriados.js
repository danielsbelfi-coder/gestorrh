'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("feriados", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      fecha: { type: Sequelize.DATEONLY, allowNull: false },
      nombre: { type: Sequelize.STRING(100), allowNull: false },
      alcance: { type: Sequelize.ENUM("nacional", "regional", "comunal"), allowNull: false },
      region: { type: Sequelize.SMALLINT, allowNull: true },
      comuna: { type: Sequelize.STRING(5), allowNull: true },
      irrenunciable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })

    // Un mismo feriado no se repite en la misma fecha, alcance y lugar.
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX feriados_fecha_lugar_unique ON feriados (fecha, alcance, COALESCE(region, 0), COALESCE(comuna, ''))`
    )
  },

  async down(queryInterface) {
    await queryInterface.dropTable("feriados")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_feriados_alcance"')
  }
};
