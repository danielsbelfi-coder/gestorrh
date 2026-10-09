function limpiarRut(texto) {
    const sinPuntos = String(texto).replace(/[.\s]/g, "")
    const cuerpo = sinPuntos.split("-")[0]
    return cuerpo
}

function calcularDv(rut) {
    const digitos = rut.split("").reverse()
    let suma = 0
    let multiplicador = 2

    for (const digito of digitos) {
        suma = suma + Number(digito) * multiplicador
        multiplicador = multiplicador === 7 ? 2 : multiplicador +1
    }

    const resultado =11 - (suma % 11)

    if (resultado === 11) {
        return "0"
    }
    if (resultado === 10) {
        return "K"
    }

    return String(resultado)
}

function rutEsValido(rut, dv) {
    const formatoCorrecto = /^\d{7,8}$/.test(rut)
    const dvCorrecto = String(dv).toUpperCase() === calcularDv(rut)
    return formatoCorrecto && dvCorrecto
}

module.exports = {
    limpiarRut,
    calcularDv,
    rutEsValido
}