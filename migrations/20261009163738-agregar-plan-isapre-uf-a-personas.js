'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("personas", "plan_isapre_uf",
      { type: Sequelize.DECIMAL(8, 4),
        allowNull: true
       });    
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("personas", "plan_isapre_uf")
  }
};