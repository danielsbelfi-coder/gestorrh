const { pesosEnPalabras } = require("../shared/numero_en_palabras.js")
const { formatearRut } = require("../shared/rut.js")
const { fechaChilena } = require("../shared/fechas.js")

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

const TIPOS_CONTRATO = { indefinido: "Indefinido", plazo_fijo: "Plazo fijo", obra_faena: "Obra o faena" }

const DESCUENTOS_LEGALES = ["AFP", "SALUD", "SALUD_ADICIONAL_ISAPRE", "CESANTIA", "IMPUESTO_UNICO"]

function aFila(linea, signo = 1) {
    return {
        nombre: linea.nombre,
        cantidad: linea.cantidad === null ? null : Number(linea.cantidad),
        monto: signo * linea.monto
    }
}

function sumar(filas) {
    return filas.reduce((suma, fila) => suma + fila.monto, 0)
}

function armarDocumento(liquidacion, cargo) {
    const periodo = liquidacion.PeriodoRemuneracion
    const empresa = periodo.Empresa
    const persona = liquidacion.Trabajador.Persona
    const lineas = liquidacion.LiquidacionLineas

    const haberes = lineas.filter((l) => l.tipo === "haber")
    const descuentos = lineas.filter((l) => l.tipo === "descuento")

    const imponibles = [
        ...haberes.filter((l) => l.imponible).map((l) => aFila(l)),
        ...descuentos.filter((l) => l.imponible).map((l) => aFila(l, -1))
    ]
    const noImponibles = haberes.filter((l) => !l.imponible).map((l) => aFila(l))
    const descuentosRestantes = descuentos.filter((l) => !l.imponible)
    const legales = descuentosRestantes.filter((l) => DESCUENTOS_LEGALES.includes(l.codigo)).map((l) => aFila(l))
    const otros = descuentosRestantes.filter((l) => !DESCUENTOS_LEGALES.includes(l.codigo)).map((l) => aFila(l))
    const aportes = lineas.filter((l) => l.tipo === "aporte_empleador").map((l) => aFila(l))

    const totalImponible = sumar(imponibles)
    const totalNoImponible = sumar(noImponibles)
    const totalHaberes = totalImponible + totalNoImponible
    const totalDescuentos = sumar(legales) + sumar(otros)
    const liquido = totalHaberes - totalDescuentos

    if (liquido !== Number(liquidacion.liquido_a_pagar)) {
        throw new Error("El documento no cuadra con el líquido guardado en la liquidación")
    }

    return {
        borrador: liquidacion.estado === "calculada",
        version: liquidacion.version,
        periodo: `${MESES[periodo.mes - 1]} ${periodo.anio}`,
        empresa: {
            razonSocial: empresa.razon_social,
            rut: formatearRut(empresa.rut, empresa.dv),
            direccion: empresa.direccion
        },
        trabajador: {
            nombre: [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" "),
            rut: formatearRut(persona.rut, persona.dv),
            cargo: cargo ? cargo.nombre : "",
            fechaIngreso: fechaChilena(liquidacion.Trabajador.fecha_ingreso),
            tipoContrato: TIPOS_CONTRATO[liquidacion.snapshot_contrato.tipo_contrato] ?? "",
            afp: persona.Afp ? persona.Afp.nombre : "",
            salud: persona.sistema_salud === "Isapre" ? (persona.Isapre ? persona.Isapre.nombre : "Isapre") : "Fonasa",
            sueldoBase: Number(liquidacion.snapshot_contrato.sueldo_base),
            diasTrabajados: liquidacion.dias_trabajados
        },
        secciones: { imponibles, noImponibles, legales, otros, aportes },
        totales: {
            imponible: totalImponible,
            noImponible: totalNoImponible,
            haberes: totalHaberes,
            legales: sumar(legales),
            otros: sumar(otros),
            descuentos: totalDescuentos,
            aportes: sumar(aportes)
        },
        liquido,
        liquidoEnPalabras: pesosEnPalabras(liquido)
    }
}

module.exports = {
    armarDocumento
}