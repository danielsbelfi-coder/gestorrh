'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("parametros_legales", [
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 31 de diciembre de 2025",
        valor: 39727.96,
        vigencia_desde: "2026-01-01",
        vigencia_hasta: "2026-01-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 31 de enero de 2026",
        valor: 39706.07,
        vigencia_desde: "2026-02-01",
        vigencia_hasta: "2026-02-28",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 28 de febrero de 2026",
        valor: 39790.63,
        vigencia_desde: "2026-03-01",
        vigencia_hasta: "2026-03-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 31 de marzo de 2026",
        valor: 39841.72,
        vigencia_desde: "2026-04-01",
        vigencia_hasta: "2026-04-30",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 30 de abril de 2026",
        valor: 40120.20,
        vigencia_desde: "2026-05-01",
        vigencia_hasta: "2026-05-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 31 de mayo de 2026",
        valor: 40610.69,
        vigencia_desde: "2026-06-01",
        vigencia_hasta: "2026-06-30",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 30 de junio de 2026",
        valor: 40820.31,
        vigencia_desde: "2026-07-01",
        vigencia_hasta: "2026-07-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 31 de julio de 2026",
        valor: 40844.79,
        vigencia_desde: "2026-08-01",
        vigencia_hasta: "2026-08-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 31 de agosto de 2026",
        valor: 40873.77,
        vigencia_desde: "2026-09-01",
        vigencia_hasta: "2026-09-30",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        codigo: "UF",
        nombre: "Unidad de fomento (último día del mes anterior)",
        tipo: "monto",
        descripcion: "UF del 30 de septiembre de 2026",
        valor: 41057.20,
        vigencia_desde: "2026-10-01",
        vigencia_hasta: "2026-10-31",
        fuente: "https://www.sii.cl/valores_y_fechas/uf/uf2026.htm",
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("parametros_legales",
      { codigo: "UF" }
    )
    
  }
};
