'use strict';

const CONCEPTOS = [
  { codigo: "SUELDO_BASE", nombre: "Sueldo base", tipo: "haber", imponible: true, tributable: true, base_gratificacion: true, calculado_por_sistema: true },
  { codigo: "HORAS_EXTRA_50", nombre: "Horas extra 50%", tipo: "haber", imponible: true, tributable: true, base_gratificacion: true, recargo_hora_extra: 50, calculado_por_sistema: true },
  { codigo: "HORAS_EXTRA_100", nombre: "Horas extra 100%", tipo: "haber", imponible: true, tributable: true, base_gratificacion: true, recargo_hora_extra: 100, calculado_por_sistema: true },
  { codigo: "GRATIFICACION", nombre: "Gratificación legal", tipo: "haber", imponible: true, tributable: true, calculado_por_sistema: true },
  { codigo: "AJUSTE_PAGO_EXCESO", nombre: "Ajuste por pago en exceso", tipo: "haber", calculado_por_sistema: true },
  { codigo: "BONO_PRODUCCION", nombre: "Bono de producción", tipo: "haber", imponible: true, tributable: true, base_gratificacion: true },
  { codigo: "COMISION", nombre: "Comisión", tipo: "haber", imponible: true, tributable: true, base_gratificacion: true },
  { codigo: "AGUINALDO", nombre: "Aguinaldo", tipo: "haber", imponible: true, tributable: true },
  { codigo: "COLACION", nombre: "Colación", tipo: "haber" },
  { codigo: "MOVILIZACION", nombre: "Movilización", tipo: "haber" },
  { codigo: "VIATICO", nombre: "Viático", tipo: "haber" },
  { codigo: "AFP", nombre: "Cotización AFP", tipo: "descuento", calculado_por_sistema: true },
  { codigo: "SALUD", nombre: "Cotización de salud", tipo: "descuento", calculado_por_sistema: true },
  { codigo: "CESANTIA", nombre: "Seguro de cesantía", tipo: "descuento", calculado_por_sistema: true },
  { codigo: "IMPUESTO_UNICO", nombre: "Impuesto único", tipo: "descuento", calculado_por_sistema: true },
  { codigo: "DESCUENTO_PAGO_EXCESO", nombre: "Descuento por pago en exceso", tipo: "descuento", calculado_por_sistema: true },
  { codigo: "ANTICIPO", nombre: "Anticipo", tipo: "descuento" },
  { codigo: "PRESTAMO_EMPRESA", nombre: "Préstamo de la empresa", tipo: "descuento" },
  { codigo: "CUOTA_SINDICAL", nombre: "Cuota sindical", tipo: "descuento" },
  { codigo: "SEGURO_COLECTIVO", nombre: "Seguro colectivo", tipo: "descuento" },
  { codigo: "RETENCION_JUDICIAL", nombre: "Retención judicial", tipo: "descuento" },
  { codigo: "OTROS_DESCUENTOS", nombre: "Otros descuentos", tipo: "descuento" }
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const ahora = new Date()

    await queryInterface.bulkInsert("conceptos_remuneracion", CONCEPTOS.map((concepto) => ({
      empresa_id: null,
      imponible: false,
      tributable: false,
      base_gratificacion: false,
      recargo_hora_extra: null,
      calculado_por_sistema: false,
      codigo_lre: null,
      activo: true,
      ...concepto,
      createdAt: ahora,
      updatedAt: ahora
    })))
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("conceptos_remuneracion", {
      empresa_id: null,
      codigo: CONCEPTOS.map((concepto) => concepto.codigo)
    })
  }
};