'use strict';

// Paquete AD: festivos que caen en un día de trabajo de la jornada (art. 38).
// - jornadas.festivos: «descanso» (el festivo se descansa) o «turno» (se trabaja según la jornada). Por defecto «turno»
//   en el sistema excepcional y el bisemanal.
// - jornadas.festivo_compensacion: el festivo trabajado se compensa con un día de descanso (art. 38 inc. 3°) o se pagan
//   sus horas con recargo del 50 % (pacto del art. 38 inc. 5°).
// - Marcas nuevas del libro: «festivo_libre» (el festivo de turno no se trabajó) y «descanso_compensatorio» (día de
//   descanso que compensa un festivo trabajado).
// - Concepto común «Festivos trabajados no compensados»: al término, los días compensatorios sin dar se pagan a un día
//   de sueldo cada uno (imponible, tributable, base de gratificación, LRE 2113; lo calcula el sistema).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("jornadas", "festivos", { type: Sequelize.ENUM("descanso", "turno"), allowNull: false, defaultValue: "descanso" })
    await queryInterface.addColumn("jornadas", "festivo_compensacion", { type: Sequelize.ENUM("descanso", "pago"), allowNull: false, defaultValue: "descanso" })
    await queryInterface.sequelize.query(`UPDATE jornadas SET festivos = 'turno' WHERE tipo IN ('excepcional', 'bisemanal')`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" ADD VALUE IF NOT EXISTS 'festivo_libre'`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" ADD VALUE IF NOT EXISTS 'descanso_compensatorio'`)

    const ahora = new Date()
    await queryInterface.sequelize.query(`
      INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
        recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
      SELECT NULL, 'FESTIVOS_COMPENSATORIOS', 'Festivos trabajados no compensados', 'haber', true, true, true, NULL, true, 2113, false, true, :ahora, :ahora
      WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'FESTIVOS_COMPENSATORIOS')
    `, { replacements: { ahora } })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = 'FESTIVOS_COMPENSATORIOS'
        AND NOT EXISTS (SELECT 1 FROM liquidacion_lineas l WHERE l.concepto_id = conceptos_remuneracion.id)
    `)
    // Los valores del tipo no se pueden quitar: las marcas nuevas quedan como permiso con goce.
    await queryInterface.sequelize.query(`UPDATE asistencias SET tipo = 'permiso_con_goce' WHERE tipo IN ('festivo_libre', 'descanso_compensatorio')`)
    await queryInterface.removeColumn("jornadas", "festivo_compensacion")
    await queryInterface.removeColumn("jornadas", "festivos")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_jornadas_festivo_compensacion"`)
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_jornadas_festivos"`)
  }
};
