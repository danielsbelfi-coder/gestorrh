'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn("liquidaciones", "horas_extra", {
              type: Sequelize.DECIMAL,
              allowNull: false,
              defaultValue: 0
          
    })
    await queryInterface.addColumn("liquidaciones", "valor_hora_extra",{
              type: Sequelize.DECIMAL,
              allowNull: false,
              defaultValue: 0          
        }
    )
    await queryInterface.addColumn("liquidaciones", "monto_horas_extra",{
              type: Sequelize.DECIMAL,
              allowNull: false,
              defaultValue: 0          
        }
    )
  },
  

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn("liquidaciones", "horas_extra")
    await queryInterface.removeColumn("liquidaciones", "valor_hora_extra")
    await queryInterface.removeColumn("liquidaciones", "monto_horas_extra")
  },
  
};