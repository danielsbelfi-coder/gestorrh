'use strict';

// Cargas familiares y asignación familiar. Ver «Cargas familiares y asignación familiar» en el SPEC.
// Crea las tablas del tramo (con historial por mes) y de las cargas, los tres conceptos del sistema y los montos por tramo
// para cada mes que ya tenga parámetros de asignación familiar (en una base nueva los crea el seeder).
const { insertarMontosFaltantes, CODIGOS_MONTOS } = require("../src/remuneraciones/montos_asignacion_familiar.js")

const CONCEPTOS = [
  { codigo: "ASIGNACION_FAMILIAR", nombre: "Asignación familiar", calculado_por_sistema: true },
  { codigo: "ASIGNACION_FAMILIAR_RETROACTIVA", nombre: "Asignación familiar retroactiva", calculado_por_sistema: false },
  { codigo: "REINTEGRO_CARGAS_FAMILIARES", nombre: "Reintegro de cargas familiares", calculado_por_sistema: false }
]
const CODIGO_LRE_ASIGNACION_FAMILIAR = 2311

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const comunes = (S) => ({
      persona_id: { type: S.INTEGER, allowNull: false, references: { model: "personas", key: "id" }, onDelete: "CASCADE" },
      usuario_registro_id: { type: S.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: S.DATE, allowNull: false },
      updatedAt: { type: S.DATE, allowNull: false }
    })

    await queryInterface.createTable("tramos_asignacion_persona", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      tramo: { type: Sequelize.ENUM("A", "B", "C", "D"), allowNull: false },
      documento: { type: Sequelize.STRING(100), allowNull: true },
      ...comunes(Sequelize)
    })
    await queryInterface.addIndex("tramos_asignacion_persona", ["persona_id", "desde"], { unique: true, name: "tramos_asignacion_persona_desde_unique" })

    await queryInterface.createTable("cargas_familiares", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      rut: { type: Sequelize.STRING(8), allowNull: true },
      dv: { type: Sequelize.STRING(1), allowNull: true },
      nombre: { type: Sequelize.STRING(120), allowNull: false },
      relacion: { type: Sequelize.ENUM("hijo", "conyuge", "conviviente_civil", "nieto", "madre_viuda", "ascendiente", "propia", "otro"), allowNull: false },
      tipo: { type: Sequelize.ENUM("simple", "maternal", "invalidez"), allowNull: false },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      hasta: { type: Sequelize.DATEONLY, allowNull: true },
      documento: { type: Sequelize.STRING(100), allowNull: true },
      ...comunes(Sequelize)
    })
    await queryInterface.addIndex("cargas_familiares", ["persona_id"], { name: "cargas_familiares_persona" })

    // Conceptos comunes (empresa_id null). Si alguno ya existe, no se duplica.
    const ahora = new Date()
    for (const concepto of CONCEPTOS) {
      await queryInterface.sequelize.query(`
        INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
          recargo_hora_extra, calculado_por_sistema, codigo_lre, activo, "createdAt", "updatedAt")
        SELECT NULL, :codigo, :nombre, 'haber', false, false, false, NULL, :calculado, :lre, true, :ahora, :ahora
        WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = :codigo)
      `, { replacements: { codigo: concepto.codigo, nombre: concepto.nombre, calculado: concepto.calculado_por_sistema, lre: CODIGO_LRE_ASIGNACION_FAMILIAR, ahora } })
    }

    await insertarMontosFaltantes(queryInterface)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: Object.values(CODIGOS_MONTOS) })
    await queryInterface.bulkDelete("conceptos_remuneracion", { empresa_id: null, codigo: CONCEPTOS.map((c) => c.codigo) })
    await queryInterface.dropTable("cargas_familiares")
    await queryInterface.dropTable("tramos_asignacion_persona")
    for (const tipo of ["enum_cargas_familiares_relacion", "enum_cargas_familiares_tipo", "enum_tramos_asignacion_persona_tramo"]) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${tipo}"`)
    }
  }
};
