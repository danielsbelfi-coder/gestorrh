'use strict';

// Paquete T: jornadas por ciclo y tipo legal. Una jornada deja de ser solo una semana de lunes a domingo:
// - tipo: semanal (art. 22 y 28), promedio (art. 22 bis, ciclo de 2 a 4 semanas), bisemanal (art. 39) o
//   excepcional (art. 38 inc. 7, autorizada por resolución de la Dirección del Trabajo).
// - ciclo_dias: largo del ciclo (7 en la semanal) e inicio_ciclo: fecha en que empieza el día 1 del ciclo
//   (null en la semanal: el día 1 es el lunes). Las cuadrillas de un mismo sistema (turno A y turno B de un 7x7)
//   son jornadas distintas con distinto inicio.
// - horas_semanales y dias_trabajados pasan a ser el promedio semanal del ciclo (un 7x7 trabaja 3,5 días por semana).
// Ver «Paquete T» en el SPEC.
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const valor of ["promedio", "bisemanal", "excepcional"]) {
      await queryInterface.sequelize.query(`ALTER TYPE "enum_jornadas_tipo" ADD VALUE IF NOT EXISTS '${valor}'`)
    }
    await queryInterface.addColumn("jornadas", "ciclo_dias", { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 7 })
    await queryInterface.addColumn("jornadas", "inicio_ciclo", { type: Sequelize.DATEONLY, allowNull: true })
    await queryInterface.addColumn("jornadas", "resolucion_numero", { type: Sequelize.STRING(60), allowNull: true })
    await queryInterface.addColumn("jornadas", "resolucion_fecha", { type: Sequelize.DATEONLY, allowNull: true })
    await queryInterface.addColumn("jornadas", "resolucion_vigencia_hasta", { type: Sequelize.DATEONLY, allowNull: true })
    await queryInterface.changeColumn("jornadas", "dias_trabajados", { type: Sequelize.DECIMAL(4, 2), allowNull: false })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`UPDATE jornadas SET dias_trabajados = ROUND(dias_trabajados)`)
    await queryInterface.changeColumn("jornadas", "dias_trabajados", { type: Sequelize.SMALLINT, allowNull: false })
    for (const columna of ["resolucion_vigencia_hasta", "resolucion_fecha", "resolucion_numero", "inicio_ciclo", "ciclo_dias"]) {
      await queryInterface.removeColumn("jornadas", columna)
    }
    // Los valores nuevos del ENUM no se pueden quitar en PostgreSQL sin recrear el tipo; quedan sin uso.
  }
};
