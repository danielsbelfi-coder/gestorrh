'use strict';

// CCAF, APV y depósito convenido. Ver «CCAF, APV y depósito convenido» en el SPEC.
// Crea la tabla de ahorros voluntarios de cada persona, los conceptos del sistema y de la caja,
// y el parámetro TASA_SALUD_CCAF (parte del 7 % de Fonasa que va a la caja, según los indicadores de Previred).

const CONCEPTOS = [
  // Calculados por el sistema desde la ficha de la persona.
  { codigo: "APVI_A", nombre: "APV individual régimen A", tipo: "descuento", sistema: true, lre: 3155 },
  { codigo: "APVI_B", nombre: "APV individual régimen B", tipo: "descuento", sistema: true, lre: 3156 },
  { codigo: "APVC_A", nombre: "APV colectivo régimen A", tipo: "descuento", sistema: true, lre: 3157 },
  { codigo: "APVC_B", nombre: "APV colectivo régimen B", tipo: "descuento", sistema: true, lre: 3158 },
  { codigo: "DEPOSITO_CONVENIDO", nombre: "Depósito convenido", tipo: "haber", sistema: true, lre: 2347 },
  { codigo: "DESCUENTO_DEPOSITO_CONVENIDO", nombre: "Depósito convenido (traspaso)", tipo: "descuento", sistema: true, lre: 3147 },
  { codigo: "APORTE_APVC", nombre: "APV colectivo, aporte del empleador", tipo: "aporte_empleador", sistema: true, lre: 4157 },
  // Variables del mes (lo que informa la caja).
  { codigo: "CCAF_CREDITO_PERSONAL", nombre: "Crédito social CCAF", tipo: "descuento", sistema: false, lre: 3110 },
  { codigo: "CCAF_DENTAL", nombre: "Descuento dental CCAF", tipo: "descuento", sistema: false, lre: 3183 },
  { codigo: "CCAF_LEASING", nombre: "Leasing CCAF (programa de ahorro)", tipo: "descuento", sistema: false, lre: 3183 },
  { codigo: "CCAF_SEGURO_VIDA", nombre: "Seguro de vida CCAF", tipo: "descuento", sistema: false, lre: 3183 },
  { codigo: "CCAF_OTROS", nombre: "Otros descuentos CCAF", tipo: "descuento", sistema: false, lre: 3183 }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ahorros_voluntarios_persona", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      persona_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "personas", key: "id" }, onDelete: "CASCADE" },
      tipo: { type: Sequelize.ENUM("apvi", "apvc", "deposito_convenido"), allowNull: false },
      institucion_codigo: { type: Sequelize.STRING(3), allowNull: false },
      institucion_nombre: { type: Sequelize.STRING(80), allowNull: false },
      numero_contrato: { type: Sequelize.STRING(20), allowNull: true },
      forma_pago: { type: Sequelize.SMALLINT, allowNull: false },
      regimen: { type: Sequelize.ENUM("A", "B"), allowNull: true },
      modalidad: { type: Sequelize.ENUM("pesos", "uf", "porcentaje"), allowNull: false },
      monto: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      aporte_empleador: { type: Sequelize.DECIMAL(12, 4), allowNull: true },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      hasta: { type: Sequelize.DATEONLY, allowNull: true },
      usuario_registro_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: "usuarios", key: "id" }, onDelete: "SET NULL" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("ahorros_voluntarios_persona", ["persona_id"], { name: "ahorros_voluntarios_persona_persona" })

    const ahora = new Date()
    for (const c of CONCEPTOS) {
      await queryInterface.sequelize.query(`
        INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
          recargo_hora_extra, calculado_por_sistema, codigo_lre, activo, "createdAt", "updatedAt")
        SELECT NULL, :codigo, :nombre, :tipo, false, false, false, NULL, :sistema, :lre, true, :ahora, :ahora
        WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = :codigo)
      `, { replacements: { ...c, ahora } })
    }

    await queryInterface.sequelize.query(`
      INSERT INTO parametros_legales (codigo, nombre, valor, tipo, vigencia_desde, vigencia_hasta, descripcion, fuente, "createdAt", "updatedAt")
      SELECT 'TASA_SALUD_CCAF', 'Cotización de salud Fonasa que va a la CCAF', 4.2, 'porcentaje', '2026-01-01', NULL,
        'Empresa afiliada a una caja: del 7 % de Fonasa, este porcentaje va a la CCAF (campo 90 de Previred) y el resto a Fonasa (campo 70)',
        'https://www.previred.com/indicadores-previsionales/', :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM parametros_legales WHERE codigo = 'TASA_SALUD_CCAF')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("parametros_legales", { codigo: "TASA_SALUD_CCAF" })
    await queryInterface.bulkDelete("conceptos_remuneracion", { empresa_id: null, codigo: CONCEPTOS.map((c) => c.codigo) })
    await queryInterface.dropTable("ahorros_voluntarios_persona")
    for (const tipo of ["enum_ahorros_voluntarios_persona_tipo", "enum_ahorros_voluntarios_persona_regimen", "enum_ahorros_voluntarios_persona_modalidad"]) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${tipo}"`)
    }
  }
};
