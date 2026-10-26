const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
    "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
    "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"]
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"]
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"]

function hastaNovecientosNoventaYNueve(n) {
    if (n === 100) {
        return "cien"
    }

    const centena = Math.floor(n / 100)
    const resto = n % 100

    let decenasYUnidades
    if (resto < 30) {
        decenasYUnidades = UNIDADES[resto]
    } else {
        const unidad = resto % 10
        decenasYUnidades = DECENAS[Math.floor(resto / 10)] + (unidad > 0 ? ` y ${UNIDADES[unidad]}` : "")
    }

    return [CENTENAS[centena], decenasYUnidades].filter((parte) => parte !== "").join(" ")
}

function apocopar(texto) {
    return texto.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un")
}

function numeroEnPalabras(numero) {
    if (!Number.isInteger(numero) || numero < 0 || numero > 999999999) {
        throw new Error("El número debe ser un entero entre 0 y 999.999.999")
    }
    if (numero === 0) {
        return "cero"
    }

    const millones = Math.floor(numero / 1000000)
    const miles = Math.floor((numero % 1000000) / 1000)
    const resto = numero % 1000

    const partes = []

    if (millones > 0) {
        partes.push(millones === 1 ? "un millón" : `${apocopar(hastaNovecientosNoventaYNueve(millones))} millones`)
    }
    if (miles > 0) {
        partes.push(miles === 1 ? "mil" : `${apocopar(hastaNovecientosNoventaYNueve(miles))} mil`)
    }
    if (resto > 0) {
        partes.push(hastaNovecientosNoventaYNueve(resto))
    }

    return partes.join(" ")
}

function pesosEnPalabras(monto) {
    const texto = apocopar(numeroEnPalabras(monto))
    const de = /(millón|millones)$/.test(texto) ? " de" : ""
    return `${texto}${de} ${monto === 1 ? "peso" : "pesos"}`
}

module.exports = {
    numeroEnPalabras,
    pesosEnPalabras
}