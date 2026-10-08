'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkUpdate("afps", {
      comision: 1.44
    },
    {codigo: "CAPITAL"},
    )
    await queryInterface.bulkUpdate("afps",
    { comision: 1.44},
    {codigo: "CUPRUM"},
    )
    await queryInterface.bulkUpdate("afps",
    { comision: 1.27},
    {codigo: "HABITAT"},
    )
    await queryInterface.bulkUpdate("afps",
    { comision: 0.58},
    {codigo: "MODELO"},
    )
    await queryInterface.bulkUpdate("afps",
    { comision: 1.16},
    {codigo: "PLANVITAL"},
    )
    await queryInterface.bulkUpdate("afps",
    { comision: 1.45},
    {codigo: "PROVIDA"},
    )
    await queryInterface.bulkUpdate("afps",
    { comision: 0.46},
    {codigo: "UNO"},
    )
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkUpdate("afps", {comision: null}, {})
  }
};