'use strict';
const { limpiarRut, rutEsValido } = require("../src/shared/rut.js")

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [empresas] = await queryInterface.sequelize.query(
      "SELECT id, rut FROM empresas"
    )

    const normalizadas = empresas.map((empresa) => ({
      id: empresa.id,
      rut: limpiarRut(empresa.rut),
      dv: String(empresa.rut).split("-")[1]?.trim().toUpperCase()
    }))

    const invalidas = normalizadas.filter((e) => !rutEsValido(e.rut, e.dv))

    if (invalidas.length > 0) {
      const ids = invalidas.map((e) => e.id).join(", ")
      throw new Error(`Empresas con RUT inválido: ${ids}. Corrígelas antes de migrar.`)
    }

    await queryInterface.addColumn("empresas", "dv", {
      type: Sequelize.STRING(1),
      allowNull: true
    })

    for (const empresa of normalizadas) {
      await queryInterface.sequelize.query(
        "UPDATE empresas SET rut = :rut, dv = :dv WHERE id = :id",
        { replacements: { rut: empresa.rut, dv: empresa.dv, id: empresa.id } }
      )
    }

    await queryInterface.changeColumn("empresas", "dv", {
      type: Sequelize.STRING(1),
      allowNull: false
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE empresas SET rut = rut || '-' || dv"
    )
    await queryInterface.removeColumn("empresas", "dv")
  }
}