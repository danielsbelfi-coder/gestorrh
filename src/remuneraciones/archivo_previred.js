const { fechaChilena } = require("../shared/fechas.js")

const TOTAL_CAMPOS = 105

const CAMPOS_TEXTO = [2, 3, 4, 5, 6, 11, 14, 16, 17, 18, 25, 35, 36, 37, 41, 46, 51, 52, 53, 54, 56, 57, 76, 104, 105]

const RELLENOS = { 32: "00,00", 34: "00", 38: "00,00", 40: "000", 45: "000", 62: "0000", 63: "00,00", 67: "0000", 68: "00,00" }

function lineaVacia() {
    const campos = Array(TOTAL_CAMPOS).fill(0)

    for (const numero of CAMPOS_TEXTO) {
        campos[numero - 1] = ""
    }
    for (const [numero, valor] of Object.entries(RELLENOS)) {
        campos[Number(numero) - 1] = valor
    }

    return campos
}

function asignar(campos, valores) {
    for (const [numero, valor] of Object.entries(valores)) {
        campos[Number(numero) - 1] = valor
    }
    return campos
}

function textoPrevired(texto, largo) {
    return String(texto ?? "").replace(/;/g, " ").trim().slice(0, largo)
}

function camposTrabajador(datos) {
    return {
        1: Number(datos.rut),
        2: datos.dv.toUpperCase(),
        3: textoPrevired(datos.apellidoPaterno, 30),
        4: textoPrevired(datos.apellidoMaterno, 30),
        5: textoPrevired(datos.nombres, 30),
        6: datos.sexo === "femenino" ? "F" : "M",
        7: datos.nacionalidad === "chilena" ? 0 : 1,
        8: "01",
        9: `${String(datos.mes).padStart(2, "0")}${datos.anio}`,
        11: "AFP",
        12: datos.tipoCotizante,
        13: datos.diasTrabajados,
        18: datos.tramo,
        25: "N"
    }
}

function camposPrevision(datos) {
    const renta = datos.rentaImponible

    const campos = {
        26: datos.codigoAfp,
        27: renta,
        28: datos.afp + datos.cuentaIndividual,
        29: datos.sis
    }

    if (datos.salud.sistema === "Fonasa") {
        return { ...campos, 64: renta, 70: datos.salud.legal, 75: "07", 78: 1 }
    }

    return {
        ...campos,
        75: datos.salud.codigoIsapre,
        77: renta,
        78: 2,
        79: String(datos.salud.planUF).replace(".", ","),
        80: datos.salud.legal,
        81: datos.salud.adicional
    }
}

const CODIGO_ISL = "00"

function camposEmpleador(datos) {
    const renta = datos.rentaImponible

    const campos = {
        92: datos.rima,
        93: datos.tipoJornada === "parcial" ? 2 : 1,
        94: datos.expectativaVida,
        95: datos.rentabilidadProtegida
    }

    if (datos.mutual.codigo === CODIGO_ISL) {
        campos[64] = renta
        campos[71] = datos.mutual.monto
        campos[96] = CODIGO_ISL
    } else {
        campos[96] = datos.mutual.codigo
        campos[97] = renta
        campos[98] = datos.mutual.monto
    }

    const { base, trabajador, empleador } = datos.cesantia
    if (trabajador + empleador > 0) {
        campos[100] = base
        campos[101] = trabajador
        campos[102] = empleador
    }

    if (datos.pagador) {
        campos[103] = Number(datos.pagador.rut)
        campos[104] = datos.pagador.dv
    }

    return campos
}

function camposMovimiento(movimiento, tipoLinea) {
    return {
        14: tipoLinea,
        15: movimiento.codigo,
        16: fechaChilena(movimiento.desde),
        17: fechaChilena(movimiento.hasta)
    }
}

function lineasTrabajador(datos) {
    const trabajador = camposTrabajador(datos.trabajador)
    const prevision = camposPrevision(datos.prevision)
    const empleador = camposEmpleador(datos.empleador)
    const [primero, ...resto] = datos.movimientos

    const principal = asignar(lineaVacia(), {
        ...trabajador,
        ...prevision,
        ...empleador,
        ...camposMovimiento(primero, "00")
    })

    const identificacion = Object.fromEntries(
        Object.entries(trabajador).filter(([numero]) => Number(numero) <= 12)
    )

    const adicionales = resto.map((movimiento) => asignar(lineaVacia(), {
        ...identificacion,
        26: prevision[26],
        75: datos.prevision.salud.sistema === "Isapre" ? prevision[75] : 0,
        93: empleador[93],
        96: empleador[96],
        ...camposMovimiento(movimiento, "01")
    }))

    return [principal, ...adicionales].map((campos) => campos.join(";"))
}

function tramoAsignacionFamiliar(renta, limites) {
    if (renta <= limites.a) {
        return "A"
    }
    if (renta <= limites.b) {
        return "B"
    }
    if (renta <= limites.c) {
        return "C"
    }
    return "D"
}



module.exports = {
    tramoAsignacionFamiliar,
    lineaVacia,
    asignar,
    camposTrabajador,
    camposPrevision,
    camposEmpleador,
    lineasTrabajador
}