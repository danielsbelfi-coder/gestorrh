'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE TYPE "enum_personas_nacionalidad" AS ENUM ('chilena', 'extranjera');`)
    await queryInterface.sequelize.query(`
      ALTER TABLE personas
      ALTER COLUMN nacionalidad TYPE "enum_personas_nacionalidad"
      USING nacionalidad::"enum_personas_nacionalidad";
    `)
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TABLE personas ALTER COLUMN nacionalidad TYPE VARCHAR(255);`)
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_personas_nacionalidad";`)
  }
};
