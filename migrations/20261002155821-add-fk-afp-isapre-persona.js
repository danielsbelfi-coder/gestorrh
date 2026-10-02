'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addConstraint("personas", {
      fields: ["afp_id"],
      type: "foreign key",
      name: "personas_afp_id_fkey",
      references: {
        table: "afps",
        field: "id"
      }
    })
    await queryInterface.addConstraint("personas", {
      fields: ["isapre_id"],
      type: "foreign key",
      name: "personas_isapre_id_fkey",
      references: {
        table: "isapres",
        field: "id"
      }
    })
  },
  

  async down (queryInterface, Sequelize) {
    await queryInterface.removeConstraint("personas", "personas_afp_id_fkey")
    await queryInterface.removeConstraint("personas", "personas_isapre_id_fkey")
  }
};