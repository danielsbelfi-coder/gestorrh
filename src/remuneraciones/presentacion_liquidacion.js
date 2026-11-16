const { DIAS_MES_COMERCIAL } = require("./dias_pago.js")
const { fechaChilena, diasEntre } = require("../shared/fechas.js")

// Nombres cortos para el PDF. La liquidación guarda el nombre completo del concepto; aquí solo se acorta al dibujar.
const GLOSAS_CORTAS = {
    REMUNERACION_VARIABLE_VACACIONES: "Rem. variable vacaciones (art. 71)",
    DEPOSITO_CONVENIDO_EXCESO: "Dep. convenido sobre 900 UF",
    DESCUENTO_DEPOSITO_CONVENIDO: "Dep. convenido (traspaso)",
    SALUD_ADICIONAL_ISAPRE: "Adicional Isapre (plan pactado)",
    DESCUENTO_PAGO_EXCESO: "Descuento pago en exceso",
    AJUSTE_PAGO_EXCESO: "Ajuste pago en exceso",
    APORTE_SIS: "SIS (invalidez y sobrevivencia)",
    APORTE_EXPECTATIVA_VIDA: "Seg. Social: expectativa de vida",
    APORTE_SEGURO_SOCIAL: "Seguro Social Previsional",
    APORTE_CUENTA_INDIVIDUAL: "Reforma: cuenta individual",
    APORTE_RENTABILIDAD_PROTEGIDA: "Reforma: rentab. protegida",
    APORTE_APVC: "APV colectivo (aporte empleador)",
    CCAF_LEASING: "Leasing CCAF",
    CCAF_CREDITO_PERSONAL: "Crédito social CCAF"
}

const TIPOS_LICENCIA = {
    comun: "Licencia médica común",
    maternal: "Licencia médica maternal",
    accidente_trabajo: "Licencia por accidente del trabajo"
}

function glosaCorta(codigo, nombre) {
    return GLOSAS_CORTAS[codigo] ?? nombre
}

function dosDigitos(numero) {
    return String(numero).padStart(2, "0")
}

// Una línea de sueldo por tramo cuando el sueldo cambió dentro del mes (anexo de sueldo).
// Los montos suman exactamente el de la línea original: la diferencia por redondeo la absorbe el último tramo con días.
function lineasSueldoPorTramo(filaSueldo, tramos) {
    if (!Array.isArray(tramos) || tramos.length < 2) {
        return [filaSueldo]
    }

    const filas = tramos.map((tramo, i) => {
        const fin = i < tramos.length - 1 ? tramos[i + 1].desdeDia - 1 : DIAS_MES_COMERCIAL
        return {
            nombre: `Sueldo base ${dosDigitos(tramo.desdeDia)} al ${dosDigitos(fin)}`,
            cantidad: tramo.dias,
            monto: Math.round(Number(tramo.sueldo) * tramo.dias / DIAS_MES_COMERCIAL)
        }
    }).filter((fila) => fila.cantidad > 0)

    if (filas.length === 0) {
        return [filaSueldo]
    }

    const diferencia = filaSueldo.monto - filas.reduce((suma, fila) => suma + fila.monto, 0)
    filas[filas.length - 1].monto += diferencia

    return filas
}

// Licencias que tocan el mes, con las fechas completas, los días dentro del mes y el folio.
function licenciasParaDocumento(licencias, anio, mes) {
    if (!Array.isArray(licencias)) {
        return []
    }

    const primerDia = `${anio}-${dosDigitos(mes)}-01`
    const ultimoDia = `${anio}-${dosDigitos(mes)}-${dosDigitos(new Date(anio, mes, 0).getDate())}`

    return licencias.map((licencia) => {
        const desdeMes = licencia.fecha_inicio > primerDia ? licencia.fecha_inicio : primerDia
        const hastaMes = licencia.fecha_termino < ultimoDia ? licencia.fecha_termino : ultimoDia

        return {
            tipo: TIPOS_LICENCIA[licencia.tipo] ?? "Licencia médica",
            desde: fechaChilena(licencia.fecha_inicio),
            hasta: fechaChilena(licencia.fecha_termino),
            dias: Math.max(0, diasEntre(desdeMes, hastaMes)),
            diasTotales: diasEntre(licencia.fecha_inicio, licencia.fecha_termino),
            folio: licencia.folio ?? null
        }
    })
}

function textoLicencia(licencia) {
    const partes = [`${licencia.tipo}: ${licencia.desde} al ${licencia.hasta}`]
    const dias = licencia.dias === licencia.diasTotales
        ? `${licencia.dias} ${licencia.dias === 1 ? "día" : "días"}`
        : `${licencia.dias} ${licencia.dias === 1 ? "día" : "días"} en el mes (de ${licencia.diasTotales})`

    partes.push(dias)
    if (licencia.folio) {
        partes.push(`folio ${licencia.folio}`)
    }

    return partes.join(" · ")
}

module.exports = {
    GLOSAS_CORTAS,
    glosaCorta,
    lineasSueldoPorTramo,
    licenciasParaDocumento,
    textoLicencia
}
