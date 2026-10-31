'use strict';

// Banco como catálogo (código) y forma de pago de la persona. Ver «Nómina bancaria» en el SPEC.
// El banco escrito como texto se convierte a código cuando se reconoce; el texto se conserva.
const { bancoDeTexto } = require("../src/shared/bancos.js")

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("personas", "banco_codigo", { type: Sequelize.STRING(3), allowNull: true })
    await queryInterface.addColumn("personas", "forma_pago", {
      type: Sequelize.ENUM("transferencia", "cheque", "efectivo", "vale_vista"), allowNull: false, defaultValue: "transferencia"
    })
    const [personas] = await queryInterface.sequelize.query("SELECT id, banco FROM personas WHERE banco IS NOT NULL AND banco <> ''")
    for (const persona of personas) {
      const codigo = bancoDeTexto(persona.banco)
      if (codigo !== null) {
        await queryInterface.sequelize.query("UPDATE personas SET banco_codigo = :codigo WHERE id = :id", { replacements: { codigo, id: persona.id } })
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("personas", "forma_pago")
    await queryInterface.removeColumn("personas", "banco_codigo")
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_personas_forma_pago"')
  }
};
