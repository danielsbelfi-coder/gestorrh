const fs = require("node:fs")
const path = require("node:path")
const { fechaChilena } = require("../shared/fechas.js")
const { COMUNAS } = require("../shared/comunas_lre.js")

const RUTA_PLANTILLA = path.join(__dirname, "plantilla_lre.csv")

function columnasLre() {
    const encabezado = fs.readFileSync(RUTA_PLANTILLA, "latin1").split(/\r?\n/)[0]

    return encabezado.split(";").map((nombre) => ({
        nombre,
        codigo: Number(nombre.match(/\((\d+)\)\s*$/)[1])
    }))
}

function encabezadoLre(columnas) {
    return columnas.map((columna) => columna.nombre).join(";")
}

function lineaLre(columnas, valores) {
    return columnas.map((columna) => valores[columna.codigo] ?? "").join(";")
}

const JORNADA_LRE = { completa: 101, parcial: 201, excluido_limitacion: 701 }
const INVALIDEZ_LRE = { invalidez_total: 2, invalidez_parcial: 3 }
const FONASA_LRE = 102

function fechaLre(fecha) {
    return fechaChilena(fecha).replaceAll("-", "/")
}

function camposIdentificacionLre(datos) {
    const termino = datos.fechaTermino !== null && datos.fechaTermino <= datos.ultimoDia
    const comuna = COMUNAS[datos.comuna]

    return {
        1101: `${datos.rut}-${datos.dv.toUpperCase()}`,
        1102: fechaLre(datos.fechaInicioContrato),
        1103: termino ? fechaLre(datos.fechaTermino) : "",
        1104: termino ? datos.causalTermino : "",
        1105: comuna.region,
        1106: Number(datos.comuna),
        1170: 1,
        1146: 0,
        1107: JORNADA_LRE[datos.tipoJornada],
        1108: INVALIDEZ_LRE[datos.tipoPension] ?? 0,
        1109: datos.tipoPension === "vejez" ? 1 : 0,
        1141: datos.afpLre,
        1142: 0,
        1143: datos.sistemaSalud === "Fonasa" ? FONASA_LRE : datos.isapreLre,
        1151: datos.cotizaCesantia ? 1 : 0,
        1110: 0,
        1152: datos.mutualLre,
        1114: datos.tramo,
        1115: datos.diasTrabajados,
        1116: datos.diasLicencia > 0 ? datos.diasLicencia : "",
        1117: datos.diasVacaciones > 0 ? datos.diasVacaciones : "",
        1118: 0,
        1155: 0,
        1157: 0,
        1131: 0
    }
}

const SIN_COLUMNA_LRE = ["AJUSTE_PAGO_EXCESO", "APORTE_CUENTA_INDIVIDUAL", "APORTE_RENTABILIDAD_PROTEGIDA", "APORTE_EXPECTATIVA_VIDA"]
const OBLIGATORIOS_MONTO = [2101, 3141, 3143, 3161, 4152, 4155]
const IMPUESTOS_REMUNERACIONES = [3161, 3163, 3164, 3165]
const COTIZACIONES_TRABAJADOR = [3141, 3143, 3144, 3146, 3151, 3154, 3155, 3156, 3157, 3158]

function camposMontosLre(lineas) {
    const montos = {}
    const sinCodigo = []

    for (const linea of lineas) {
        if (linea.codigo_lre === null) {
            if (!SIN_COLUMNA_LRE.includes(linea.codigo)) {
                sinCodigo.push(linea.codigo)
            }
            continue
        }

        const codigo = linea.codigo_lre
        const resta = linea.tipo === "descuento" && Math.floor(codigo / 1000) === 2
        montos[codigo] = (montos[codigo] ?? 0) + (resta ? -linea.monto : linea.monto)
    }

    const ajuste = lineas.filter((l) => l.codigo === "AJUSTE_PAGO_EXCESO").reduce((suma, l) => suma + l.monto, 0)
    if (ajuste > 0) {
        montos[3188] = (montos[3188] ?? 0) - ajuste
    }

    for (const codigo of OBLIGATORIOS_MONTO) {
        montos[codigo] = montos[codigo] ?? 0
    }

    const sumar = (condicion) => Object.entries(montos)
        .filter(([codigo]) => condicion(Number(codigo)))
        .reduce((suma, [, monto]) => suma + monto, 0)

    const totalHaberes = sumar((c) => Math.floor(c / 1000) === 2)
    const totalDescuentos = sumar((c) => Math.floor(c / 1000) === 3)
    const impuestos = sumar((c) => IMPUESTOS_REMUNERACIONES.includes(c))
    const cotizaciones = sumar((c) => COTIZACIONES_TRABAJADOR.includes(c))

    return {
        valores: {
            ...montos,
            5201: totalHaberes,
            5210: sumar((c) => Math.floor(c / 100) === 21),
            5220: sumar((c) => Math.floor(c / 100) === 22),
            5230: sumar((c) => Math.floor(c / 100) === 23),
            5240: sumar((c) => Math.floor(c / 100) === 24),
            5301: totalDescuentos,
            5361: impuestos,
            5341: cotizaciones,
            5302: totalDescuentos - impuestos - cotizaciones,
            5410: sumar((c) => Math.floor(c / 1000) === 4),
            5501: totalHaberes - totalDescuentos,
            5564: 0
        },
        sinCodigo
    }
}

module.exports = {
    columnasLre,
    encabezadoLre,
    lineaLre,
    camposIdentificacionLre,
    camposMontosLre
}