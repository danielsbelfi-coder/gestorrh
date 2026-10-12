'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("contratos_anexo", "usuario_firmo_id", 
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "usuarios",
          key: "id"
        }
      });

  },

  async down(queryInterface, Sequelize) {
   await queryInterface.removeColumn("contratos_anexo", "usuario_firmo_id");
   
  }
};
