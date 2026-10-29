'use strict';
const bcrypt = require("bcrypt")

// Solo para desarrollo: nunca ejecutar en producción
const PASSWORD_PRUEBA = "Prueba123!"
const EMAIL = "comercial@gestorrh.com"

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Usuarios con contraseña conocida: jamás en la nube.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Este seeder crea usuarios de prueba con contraseña conocida y no se ejecuta con NODE_ENV=production")
    }

    const passwordHash = await bcrypt.hash(PASSWORD_PRUEBA, 10)
    const ahora = new Date()

    await queryInterface.bulkInsert("usuarios", [
      {
        nombre: "Comercial Prueba",
        email: EMAIL,
        password_hash: passwordHash,
        estado: "activo",
        rol_plataforma: "comercial",
        createdAt: ahora,
        updatedAt: ahora
      }
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("usuarios", {
      email: EMAIL
    })
  }
};
