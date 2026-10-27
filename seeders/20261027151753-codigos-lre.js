'use strict';

const CODIGOS = {
  afps: { PROVIDA: 6, PLANVITAL: 11, CUPRUM: 13, HABITAT: 14, UNO: 19, CAPITAL: 31, MODELO: 103 },
  isapres: { CRUZBLANCA: 1, BANMEDICA: 3, COLMENA: 4, CONSALUD: 9, VIDATRES: 12, CRUZDELNORTE: 38, FUNDACION: 40, MASVIDA: 43, ESENCIAL: 44 },
  mutualidades: { ISL: 0, ACHS: 1, MUTUAL_CCHC: 2, IST: 3 }
}

const CONCEPTOS = {
  SUELDO_BASE: 2101, DESCUENTO_ATRASOS: 2101, HORAS_EXTRA_50: 2102, HORAS_EXTRA_100: 2102,
  COMISION: 2103, GRATIFICACION: 2106, AGUINALDO: 2110, BONO_PRODUCCION: 2113,
  COLACION: 2301, MOVILIZACION: 2302, VIATICO: 2303,
  AFP: 3141, SALUD: 3143, SALUD_ADICIONAL_ISAPRE: 3144, CESANTIA: 3151, IMPUESTO_UNICO: 3161,
  CUOTA_SINDICAL: 3171, SEGURO_COLECTIVO: 3183, OTROS_DESCUENTOS: 3185, RETENCION_JUDICIAL: 3186,
  ANTICIPO: 3188, PRESTAMO_EMPRESA: 3188, DESCUENTO_PAGO_EXCESO: 3188,
  APORTE_CESANTIA: 4151, APORTE_MUTUAL: 4152, APORTE_SANNA: 4152, APORTE_SIS: 4155
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [tabla, porCodigo] of Object.entries(CODIGOS)) {
      for (const [codigo, codigoLre] of Object.entries(porCodigo)) {
        await queryInterface.bulkUpdate(tabla, { codigo_lre: codigoLre }, { codigo })
      }
    }

    for (const [codigo, codigoLre] of Object.entries(CONCEPTOS)) {
      await queryInterface.bulkUpdate("conceptos_remuneracion", { codigo_lre: codigoLre }, { codigo, empresa_id: null })
    }
  },

  async down(queryInterface, Sequelize) {
    for (const tabla of Object.keys(CODIGOS)) {
      await queryInterface.bulkUpdate(tabla, { codigo_lre: null }, {})
    }
    await queryInterface.bulkUpdate("conceptos_remuneracion", { codigo_lre: null }, { empresa_id: null })
  }
};
