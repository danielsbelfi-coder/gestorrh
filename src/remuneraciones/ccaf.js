// Reglas puras de la caja de compensación (CCAF) para Previred y el LRE. Ver «CCAF, APV y depósito convenido» en el SPEC.
// Las claves de las cajas son las de datos_empresa.js (CCAF).

// Previred, tabla 18 (campo 83).
const CODIGO_PREVIRED = { los_andes: "01", la_araucana: "02", los_heroes: "03", "18_septiembre": "06" }
// LRE, código 1110 (0 = sin caja).
const CODIGO_LRE = { los_andes: 1, la_araucana: 2, los_heroes: 3, "18_septiembre": 4 }

// Descuentos de la caja (conceptos variables) y su campo en Previred, con las cajas que aceptan cada uno
// (formato de largo variable de Previred, campos 85 a 89).
const TODAS = Object.keys(CODIGO_PREVIRED)
const DESCUENTOS_CCAF = {
    CCAF_CREDITO_PERSONAL: { campo: 85, nombre: "créditos personales", cajas: TODAS },
    CCAF_DENTAL: { campo: 86, nombre: "descuento dental", cajas: ["los_heroes"] },
    CCAF_LEASING: { campo: 87, nombre: "leasing (programa de ahorro)", cajas: TODAS },
    CCAF_SEGURO_VIDA: { campo: 88, nombre: "seguro de vida", cajas: ["los_andes", "18_septiembre", "los_heroes"] },
    CCAF_OTROS: { campo: 89, nombre: "otros descuentos", cajas: ["los_heroes"] }
}

// Parte de la cotización legal de salud de Fonasa que va a la caja (el resto va a Fonasa).
// Isapre o empresa sin caja: 0.
function saludParaCcaf({ caja, sistemaSalud, baseCotizaciones, saludLegal, tasa }) {
    if (!caja || sistemaSalud !== "Fonasa") {
        return 0
    }
    return Math.min(Math.round(baseCotizaciones * tasa / 100), saludLegal)
}

// Parámetro de la parte del 7 % de Fonasa que va a la caja: pensionados 1 %, el resto 4,2 % (indicadores Previred).
function codigoTasaSaludCcaf(pensionado) {
    return pensionado ? "TASA_SALUD_CCAF_PENSIONADOS" : "TASA_SALUD_CCAF"
}

// Problemas de una liquidación con descuentos de caja: sin caja, o un descuento que su caja no recibe.
// montos = { CODIGO: monto }.
function problemasDescuentosCcaf(caja, montos) {
    const problemas = []
    for (const [codigo, regla] of Object.entries(DESCUENTOS_CCAF)) {
        if (!(montos[codigo] > 0)) {
            continue
        }
        if (!caja) {
            problemas.push(`Tiene descuento de caja (${regla.nombre}), pero la empresa no tenía caja de compensación al calcular la liquidación`)
        } else if (!regla.cajas.includes(caja)) {
            problemas.push(`La caja de la empresa no recibe ${regla.nombre} por Previred`)
        }
    }
    return problemas
}

module.exports = { CODIGO_PREVIRED, CODIGO_LRE, DESCUENTOS_CCAF, saludParaCcaf, codigoTasaSaludCcaf, problemasDescuentosCcaf }
