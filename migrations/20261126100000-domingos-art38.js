'use strict';

// Paquete AE: domingos de los exceptuados del descanso dominical (art. 38) y jornada semanal rotativa.
// - jornadas.tipo «rotativa»: jornada semanal (art. 22) cuyo horario cambia de una semana a otra en un ciclo de 2 a 4
//   semanas que se repite (por ejemplo, domingo sí, domingo no). Cada semana cumple las reglas de la jornada semanal.
// - contratos: causal del art. 38 (ninguna | n2 | n7 | otra), «contratado solo para sábados, domingos o festivos» y el
//   recargo de domingo pactado para el N° 7 (art. 38 inc. 2°: a lo menos 30 %; reemplaza un «bono domingo» propio).
//   Son datos de gestión: se cambian sin anexo.
// - Marca «domingo_libre» (art. 38): el domingo de trabajo se da libre; opcionalmente se trabaja otro día libre de la
//   misma semana y mes (asistencias.fecha_reemplazo) con el horario del domingo.
// - Conceptos comunes: RECARGO_DOMINGO (LRE 2107) y HORAS_EXTRA_DOMINGO (hora extra en domingo del N° 7: la base es la
//   hora ordinaria con el 30 %, más el 50 % → recargo 95 %, LRE 2102).
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`ALTER TYPE "enum_jornadas_tipo" ADD VALUE IF NOT EXISTS 'rotativa'`)
    await queryInterface.sequelize.query(`ALTER TYPE "enum_asistencias_tipo" ADD VALUE IF NOT EXISTS 'domingo_libre'`)
    await queryInterface.addColumn("asistencias", "fecha_reemplazo", { type: Sequelize.DATEONLY, allowNull: true })
    await queryInterface.addColumn("contratos_trabajo", "art38_causal", { type: Sequelize.ENUM("ninguna", "n2", "n7", "otra"), allowNull: false, defaultValue: "ninguna" })
    await queryInterface.addColumn("contratos_trabajo", "solo_fin_semana", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false })
    await queryInterface.addColumn("contratos_trabajo", "recargo_domingo", { type: Sequelize.DECIMAL(5, 2), allowNull: true })

    const ahora = new Date()
    const conceptos = [
      ["RECARGO_DOMINGO", "Recargo domingo (art. 38)", null, 2107],
      ["HORAS_EXTRA_DOMINGO", "Horas extra en domingo (art. 38)", 95, 2102]
    ]
    for (const [codigo, nombre, recargo, lre] of conceptos) {
      await queryInterface.sequelize.query(`
        INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
          recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
        SELECT NULL, :codigo, :nombre, 'haber', true, true, true, :recargo, true, :lre, false, true, :ahora, :ahora
        WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = :codigo)
      `, { replacements: { codigo, nombre, recargo, lre, ahora } })
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo IN ('RECARGO_DOMINGO', 'HORAS_EXTRA_DOMINGO')
        AND NOT EXISTS (SELECT 1 FROM liquidacion_lineas l WHERE l.concepto_id = conceptos_remuneracion.id)
        AND NOT EXISTS (SELECT 1 FROM variables_periodo v WHERE v.concepto_id = conceptos_remuneracion.id)
    `)
    await queryInterface.removeColumn("contratos_trabajo", "recargo_domingo")
    await queryInterface.removeColumn("contratos_trabajo", "solo_fin_semana")
    await queryInterface.removeColumn("contratos_trabajo", "art38_causal")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_contratos_trabajo_art38_causal"`)
    // Los valores de los tipos no se pueden quitar: los domingos libres quedan como permiso con goce y las jornadas
    // rotativas como semanales (revisar a mano: su plantilla tiene más de 7 días).
    await queryInterface.sequelize.query(`UPDATE asistencias SET tipo = 'permiso_con_goce' WHERE tipo = 'domingo_libre'`)
    await queryInterface.removeColumn("asistencias", "fecha_reemplazo")
  }
};
