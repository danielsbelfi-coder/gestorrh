'use strict';

// Paquete AG: imponentes del antiguo sistema previsional (ex-cajas de previsión administradas por el IPS, ex INP).
// - ex_cajas_regimen: las 110 combinaciones de ex-caja y régimen, con su código del LRE (campo 1142, tabla del
//   Suplemento del LRE de la DT: 0 = no pertenece al IPS, 1..110), su código Previred (campo 62, tabla N° 14: caja de 2
//   dígitos + régimen de 2 dígitos) y, si tiene, su código de desahucio (campo 67, tabla N° 15).
// - tasas_ex_caja: tasa de previsión (pensión + revalorización, sin desahucio: campo 63 de Previred) y tasa de desahucio
//   (campo 68), con vigencia. Se cargan las verificadas (EMPART régimen 1: 20,70 % + 1,14 %; SSS régimen 1: 18,84 %); las
//   demás se completan en Parámetros. Sin tasa vigente, la liquidación avisa y no se calcula.
// - previsiones_persona: régimen AFP | IPS, ex-caja y régimen, y si cotiza desahucio.
// - Parámetros: TOPE_IMPONIBLE_IPS_UF = 60 (previsión, salud, accidentes del trabajo y Ley Sanna) y TASA_SALUD_CCAF_IPS =
//   3,1 (del 7 % de salud, la parte que va a la caja de compensación desde diciembre de 2020; el resto, 3,9 %, a Fonasa).
// - Conceptos: COTIZACION_IPS y COTIZACION_DESAHUCIO (descuentos legales; ambos van al 3141 del LRE).
const CATALOGO = [
  [1, "0201", "Bancaria", 1, "0201"],
  [2, "0202", "Bancaria", 2, "0202"],
  [3, "0203", "Bancaria", 3, "0203"],
  [4, "0214", "Bancaria", 14, null],
  [5, "0221", "Bancaria", 21, null],
  [6, "0234", "Bancaria", 34, null],
  [7, "2201", "Caja de Previsión de Gildemeister", 1, null],
  [8, "2202", "Caja de Previsión de Gildemeister", 2, null],
  [9, "1601", "Caja de Previsión Social de los EE", 1, "1601"],
  [10, "1602", "Caja de Previsión Social de los EE", 2, "1602"],
  [11, "1202", "Caja Ferro", 2, null],
  [12, "1203", "Caja Ferro", 3, null],
  [13, "1204", "Caja Ferro", 4, "1204"],
  [14, "1205", "Caja Ferro", 5, null],
  [15, "1207", "Caja Ferro", 7, null],
  [16, "1401", "Canaempu: Periodistas", 1, "1401"],
  [17, "1402", "Canaempu: Periodistas", 2, "1402"],
  [18, "1403", "Canaempu: Periodistas", 3, null],
  [19, "1404", "Canaempu: Periodistas", 4, null],
  [20, "1405", "Canaempu: Periodistas", 5, null],
  [21, "1406", "Canaempu: Periodistas", 6, "1406"],
  [22, "1407", "Canaempu: Periodistas", 7, null],
  [23, "1408", "Canaempu: Periodistas", 8, null],
  [24, "1411", "Canaempu: Periodistas", 11, null],
  [25, "1412", "Canaempu: Periodistas", 12, null],
  [26, "1413", "Canaempu: Periodistas", 13, null],
  [27, "1414", "Canaempu: Periodistas", 14, null],
  [28, "1415", "Canaempu: Periodistas", 15, null],
  [29, "1416", "Canaempu: Periodistas", 16, null],
  [30, "1417", "Canaempu: Periodistas", 17, null],
  [31, "1418", "Canaempu: Periodistas", 18, null],
  [32, "1421", "Canaempu: Periodistas", 21, null],
  [33, "1422", "Canaempu: Periodistas", 22, null],
  [34, "1423", "Canaempu: Periodistas", 23, null],
  [35, "1424", "Canaempu: Periodistas", 24, null],
  [36, "1425", "Canaempu: Periodistas", 25, null],
  [37, "1426", "Canaempu: Periodistas", 26, null],
  [38, "1431", "Canaempu: Periodistas", 31, null],
  [39, "1432", "Canaempu: Periodistas", 32, null],
  [40, "1433", "Canaempu: Periodistas", 33, null],
  [41, "1434", "Canaempu: Periodistas", 34, null],
  [42, "1301", "Canaempu: Públicos", 1, null],
  [43, "1302", "Canaempu: Públicos", 2, null],
  [44, "1303", "Canaempu: Públicos", 3, "1303"],
  [45, "1305", "Canaempu: Públicos", 5, null],
  [46, "1306", "Canaempu: Públicos", 6, null],
  [47, "1308", "Canaempu: Públicos", 8, null],
  [48, "1309", "Canaempu: Públicos", 9, null],
  [49, "1310", "Canaempu: Públicos", 10, null],
  [50, "1311", "Canaempu: Públicos", 11, "1311"],
  [51, "1312", "Canaempu: Públicos", 12, null],
  [52, "1321", "Canaempu: Públicos", 21, null],
  [53, "1322", "Canaempu: Públicos", 22, null],
  [54, "1323", "Canaempu: Públicos", 23, null],
  [55, "1325", "Canaempu: Públicos", 25, null],
  [56, "1326", "Canaempu: Públicos", 26, null],
  [57, "1328", "Canaempu: Públicos", 28, null],
  [58, "1329", "Canaempu: Públicos", 29, null],
  [59, "1330", "Canaempu: Públicos", 30, null],
  [60, "1331", "Canaempu: Públicos", 31, null],
  [61, "1332", "Canaempu: Públicos", 32, null],
  [62, "1338", "Canaempu: Públicos", 38, null],
  [63, "0501", "Caprebech", 1, "0501"],
  [64, "0503", "Caprebech", 3, "0503"],
  [65, "0514", "Caprebech", 14, null],
  [66, "0521", "Caprebech", 21, null],
  [67, "0534", "Caprebech", 34, null],
  [68, "0601", "Capremer", 1, "0601"],
  [69, "0602", "Capremer", 2, null],
  [70, "0603", "Capremer", 3, "0603"],
  [71, "0604", "Capremer", 4, null],
  [72, "0605", "Capremer", 5, null],
  [73, "0606", "Capremer", 6, null],
  [74, "0608", "Capremer", 8, null],
  [75, "1501", "Copremusa EE", 1, "1501"],
  [76, "1502", "Copremusa EE", 2, null],
  [77, "1503", "Copremusa EE", 3, "1503"],
  [78, "1901", "Diomp", 1, "1901"],
  [79, "1701", "EE Municipales de la República", 1, "1701"],
  [80, "1702", "EE Municipales de la República", 2, null],
  [81, "1703", "EE Municipales de la República", 3, null],
  [82, "1704", "EE Municipales de la República", 4, null],
  [83, "2001", "EE Salitre", 1, null],
  [84, "2002", "EE Salitre", 2, null],
  [85, "0101", "Empart", 1, "0101"],
  [86, "0102", "Empart", 2, "0101"],
  [87, "0103", "Empart", 3, "0101"],
  [88, "0104", "Empart", 4, "0101"],
  [89, "0106", "Empart", 6, "0101"],
  [90, "1001", "Empleados de Emos", 1, null],
  [91, "0801", "Hípica Nacional", 1, null],
  [92, "0802", "Hípica Nacional", 2, null],
  [93, "0803", "Hípica Nacional", 3, null],
  [94, "0804", "Hípica Nacional", 4, null],
  [95, "2301", "Mauricio Hochschild", 1, null],
  [96, "2302", "Mauricio Hochschild", 2, null],
  [97, "1101", "Obreros de Emos", 1, null],
  [98, "1801", "OO Municipales de la República", 1, null],
  [99, "1802", "OO Municipales de la República", 2, null],
  [100, "1803", "OO Municipales de la República", 3, null],
  [101, "2101", "Sección Esp. Previsión Empleados", 1, null],
  [102, "2102", "Sección Esp. Previsión Empleados", 2, null],
  [103, "2401", "Secgasco", 1, null],
  [104, "2402", "Secgasco", 2, null],
  [105, "0901", "Servicio de Seguro Social", 1, null],
  [106, "0902", "Servicio de Seguro Social", 2, "0902"],
  [107, "0701", "Triomar", 1, null],
  [108, "0702", "Triomar", 2, null],
  [109, "0703", "Triomar", 3, null],
  [110, "0704", "Triomar", 4, null]
]
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ex_cajas_regimen", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      codigo_lre: { type: Sequelize.INTEGER, allowNull: false, unique: true },
      codigo_previred: { type: Sequelize.STRING(4), allowNull: false, unique: true },
      caja: { type: Sequelize.STRING(80), allowNull: false },
      regimen: { type: Sequelize.INTEGER, allowNull: false },
      codigo_desahucio: { type: Sequelize.STRING(4), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.createTable("tasas_ex_caja", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      ex_caja_regimen_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: "ex_cajas_regimen", key: "id" }, onDelete: "CASCADE" },
      desde: { type: Sequelize.DATEONLY, allowNull: false },
      tasa_prevision: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      tasa_desahucio: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      fuente: { type: Sequelize.STRING(255), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    })
    await queryInterface.addIndex("tasas_ex_caja", ["ex_caja_regimen_id", "desde"], { unique: true, name: "tasas_ex_caja_regimen_desde" })

    const ahora = new Date()
    await queryInterface.bulkInsert("ex_cajas_regimen", CATALOGO.map(([codigo_lre, codigo_previred, caja, regimen, codigo_desahucio]) => ({
      codigo_lre, codigo_previred, caja, regimen, codigo_desahucio, createdAt: ahora, updatedAt: ahora
    })))
    const fuente = "https://nuevo.ips.gob.cl (Tasas del Régimen General)"
    await queryInterface.sequelize.query(`
      INSERT INTO tasas_ex_caja (ex_caja_regimen_id, desde, tasa_prevision, tasa_desahucio, fuente, "createdAt", "updatedAt")
      SELECT id, '2000-01-01', CASE codigo_lre WHEN 85 THEN 20.70 ELSE 18.84 END, CASE codigo_lre WHEN 85 THEN 1.14 ELSE 0 END, :fuente, :ahora, :ahora
      FROM ex_cajas_regimen WHERE codigo_lre IN (85, 105)
    `, { replacements: { ahora, fuente } })

    await queryInterface.addColumn("previsiones_persona", "regimen", { type: Sequelize.ENUM("AFP", "IPS"), allowNull: false, defaultValue: "AFP" })
    await queryInterface.addColumn("previsiones_persona", "ex_caja_regimen_id", { type: Sequelize.INTEGER, allowNull: true, references: { model: "ex_cajas_regimen", key: "id" } })
    await queryInterface.addColumn("previsiones_persona", "cotiza_desahucio", { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true })

    const parametros = [
      ["TOPE_IMPONIBLE_IPS_UF", "Tope imponible IPS (ex INP) (UF)", 60, "monto", "2000-01-01", "Imponentes de ex-cajas: tope de la previsión, la salud, el seguro de accidentes del trabajo y la Ley Sanna", "https://www.previred.com/indicadores-previsionales/"],
      ["TASA_SALUD_CCAF_IPS", "Cotización de salud de imponentes IPS que va a la CCAF", 3.1, "porcentaje", "2020-12-01", "Imponentes de ex-cajas con empleador afiliado a una caja: del 7 % de salud, 3,9 % va a Fonasa y este porcentaje a la caja (desde las remuneraciones de diciembre de 2020)", "https://nuevo.ips.gob.cl"]
    ]
    for (const [codigo, nombre, valor, tipo, desde, descripcion, fuenteParametro] of parametros) {
      await queryInterface.sequelize.query(`
        INSERT INTO parametros_legales (codigo, nombre, valor, tipo, vigencia_desde, vigencia_hasta, descripcion, fuente, "createdAt", "updatedAt")
        SELECT :codigo, :nombre, :valor, :tipo, :desde, NULL, :descripcion, :fuente, :ahora, :ahora
        WHERE NOT EXISTS (SELECT 1 FROM parametros_legales WHERE codigo = :codigo)
      `, { replacements: { codigo, nombre, valor, tipo, desde, descripcion, fuente: fuenteParametro, ahora } })
    }

    for (const [codigo, nombre] of [["COTIZACION_IPS", "Cotización IPS (ex-caja)"], ["COTIZACION_DESAHUCIO", "Cotización de desahucio (ex-caja)"]]) {
      await queryInterface.sequelize.query(`
        INSERT INTO conceptos_remuneracion (empresa_id, codigo, nombre, tipo, imponible, tributable, base_gratificacion,
          recargo_hora_extra, calculado_por_sistema, codigo_lre, devengo_diario, activo, "createdAt", "updatedAt")
        SELECT NULL, :codigo, :nombre, 'descuento', false, false, false, NULL, true, 3141, false, true, :ahora, :ahora
        WHERE NOT EXISTS (SELECT 1 FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo = :codigo)
      `, { replacements: { codigo, nombre, ahora } })
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM conceptos_remuneracion WHERE empresa_id IS NULL AND codigo IN ('COTIZACION_IPS', 'COTIZACION_DESAHUCIO')
        AND NOT EXISTS (SELECT 1 FROM liquidacion_lineas l WHERE l.concepto_id = conceptos_remuneracion.id)
    `)
    await queryInterface.sequelize.query(`DELETE FROM parametros_legales WHERE codigo IN ('TOPE_IMPONIBLE_IPS_UF', 'TASA_SALUD_CCAF_IPS')`)
    await queryInterface.removeColumn("previsiones_persona", "cotiza_desahucio")
    await queryInterface.removeColumn("previsiones_persona", "ex_caja_regimen_id")
    await queryInterface.removeColumn("previsiones_persona", "regimen")
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_previsiones_persona_regimen"`)
    await queryInterface.dropTable("tasas_ex_caja")
    await queryInterface.dropTable("ex_cajas_regimen")
  }
};
