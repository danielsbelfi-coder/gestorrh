'use strict';
const bcrypt = require("bcrypt")

// Solo para desarrollo: nunca ejecutar en producción
const PASSWORD_PRUEBA = "Prueba123!"
const EMPRESA_ID = 1
const USUARIOS = [
  { email: "admin@prueba.cl", nombre: "Admin Prueba", rol: "ADMIN" },
  { email: "jefe@prueba.cl", nombre: "Jefe RRHH Prueba", rol: "JEFE_RRHH" },
  { email: "rrhh@prueba.cl", nombre: "RRHH Prueba", rol: "RRHH" },
  { email: "supervisor@prueba.cl", nombre: "Supervisor Prueba", rol: "SUPERVISOR" },
  { email: "lectura@prueba.cl", nombre: "Lectura Prueba", rol: "LECTURA" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const passwordHash = await bcrypt.hash(PASSWORD_PRUEBA, 10)
    const ahora = new Date()

    // 1. Crear los usuarios
    await queryInterface.bulkInsert("usuarios", USUARIOS.map((u) => ({
      nombre: u.nombre,
      email: u.email,
      password_hash: passwordHash,
      estado: "activo",
      es_soporte_plataforma: false,
      createdAt: ahora,
      updatedAt: ahora
    })))

    // 2. Buscar los ids recién creados y los ids de los roles
    const [usuarios] = await queryInterface.sequelize.query(
      "SELECT id, email FROM usuarios WHERE email IN (:emails)",
      { replacements: { emails: USUARIOS.map((u) => u.email) } }
    )
    const [roles] = await queryInterface.sequelize.query("SELECT id, codigo FROM roles")

    // 3. Vincular cada usuario con su rol en la empresa
    await queryInterface.bulkInsert("usuarios_empresas_roles", USUARIOS.map((u) => ({
      usuario_id: usuarios.find((x) => x.email === u.email).id,
      empresa_id: EMPRESA_ID,
      rol_id: roles.find((r) => r.codigo === u.rol).id,
      estado: "activo",
      createdAt: ahora,
      updatedAt: ahora
    })))
  },

  async down(queryInterface, Sequelize) {
    const emails = USUARIOS.map((u) => u.email)
    await queryInterface.sequelize.query(
      "DELETE FROM usuarios_empresas_roles WHERE usuario_id IN (SELECT id FROM usuarios WHERE email IN (:emails))",
      { replacements: { emails } }
    )
    await queryInterface.bulkDelete("usuarios", { email: emails })
  }
};
