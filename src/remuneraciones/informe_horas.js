// Informe de horas extra y descuentos por atraso de un trabajador en un periodo (funciones puras).
// Ver «Informe de horas extra y atrasos» en el SPEC.
//
// - El detalle por día sale del libro de asistencia: solo las marcas aprobadas suman; las pendientes se muestran sin sumar.
// - Los montos salen de la liquidación del periodo (calculada o cerrada): se reparten las líneas «Horas extra 50 %»,
//   «Horas extra 100 %» y «Descuento por atrasos» entre los días en proporción a sus horas o minutos (método del resto
//   mayor), así la suma de los días es exactamente lo que se pagó o descontó. Las horas pendientes de meses cerrados
//   (variables con mes de origen) van en su propia fila y también reciben su parte.
// - Si las horas del libro ya no cuadran con las de la liquidación (cambió el libro después de calcular), cada día se
//   valoriza con el valor hora de la liquidación y se avisa que hay que volver a generar el resumen y recalcular.
// - Sin liquidación no hay montos: solo horas y minutos.

const RECARGOS = [50, 100]
const DIAS = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
const TIPOS_DIA = { laboral: "Laboral", libre: "Día libre", feriado: "Feriado", licencia: "Licencia", fuera_contrato: "Fuera de contrato", sin_horario: "Sin horario" }
const TOLERANCIA_HORAS = 0.01

const redondear2 = (numero) => Math.round(numero * 100) / 100

// Reparte un total entero entre partes con pesos, de modo que la suma sea exactamente el total (resto mayor).
function repartir(total, pesos) {
    const suma = pesos.reduce((s, p) => s + p, 0)
    if (suma <= 0 || total === 0) {
        return pesos.map(() => 0)
    }
    const exactos = pesos.map((p) => total * p / suma)
    const enteros = exactos.map((x) => Math.floor(x))
    let faltan = total - enteros.reduce((s, x) => s + x, 0)
    const orden = exactos.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
    for (const [, i] of orden) {
        if (faltan <= 0) {
            break
        }
        enteros[i]++
        faltan--
    }
    return enteros
}

// Fila del día para el informe (solo días con horas extra o atraso).
function filaDelDia(dia) {
    const marca = dia.marca ?? {}
    const esperado = dia.esperado ?? {}
    return {
        fecha: dia.fecha,
        dia: DIAS[dia.diaSemana] ?? "",
        tipoDia: TIPOS_DIA[esperado.tipo] ?? esperado.tipo ?? "",
        nombreFeriado: esperado.nombre ?? null,
        horario: esperado.entrada && esperado.salida ? `${String(esperado.entrada).slice(0, 5)}–${String(esperado.salida).slice(0, 5)}` : "",
        entrada: marca.hora_entrada ? String(marca.hora_entrada).slice(0, 5) : (esperado.entrada ? String(esperado.entrada).slice(0, 5) : ""),
        salida: marca.hora_salida ? String(marca.hora_salida).slice(0, 5) : (esperado.salida ? String(esperado.salida).slice(0, 5) : ""),
        recargo: dia.minutosExtra > 0 ? dia.recargo : null,
        minutosExtra: dia.minutosExtra,
        horasExtra: redondear2(dia.minutosExtra / 60),
        // Atraso del día: el atraso de la entrada, lo compensado después de la salida y la salida anticipada.
        atraso: dia.atraso ?? 0,
        compensado: dia.compensado ?? 0,
        salidaAnticipada: dia.salidaAnticipada ?? 0,
        minutosDescuento: dia.minutosDescuento,
        aprobada: dia.cuenta === true,
        estadoMarca: marca.estado_aprobacion ?? null,
        observacion: marca.observaciones ?? "",
        montoExtra: null,
        montoAtraso: null
    }
}

// libro: resultado de calcularLibro. pendientes: [{ recargo, horas, mesOrigen }] (variables aprobadas de meses cerrados).
// liquidacion: null o { estado, valorHora, lineas: { 50: { cantidad, monto }, 100: {…}, atraso: { cantidad, monto } } }.
function armarInformeHoras({ libro, pendientes = [], liquidacion = null }) {
    const avisos = []
    const filas = libro.dias
        .filter((d) => d.marca && d.marca.estado_aprobacion !== "rechazada" && (d.minutosExtra > 0 || d.minutosDescuento > 0))
        .map(filaDelDia)
    const aprobadas = filas.filter((f) => f.aprobada)
    const anteriores = pendientes.map((p) => ({ recargo: Number(p.recargo), horas: redondear2(Number(p.horas)), mesOrigen: String(p.mesOrigen ?? "").slice(0, 7), monto: null }))

    if (filas.some((f) => !f.aprobada)) {
        avisos.push("Hay marcas pendientes de aprobación: se muestran, pero no suman ni se pagan hasta aprobarlas")
    }

    const totales = { horas50: 0, horas100: 0, minutosAtraso: 0, monto50: null, monto100: null, montoAtraso: null }
    for (const recargo of RECARGOS) {
        const minutos = aprobadas.filter((f) => f.recargo === recargo).reduce((s, f) => s + f.minutosExtra, 0)
        const horasAnteriores = anteriores.filter((p) => p.recargo === recargo).reduce((s, p) => s + p.horas, 0)
        totales[`horas${recargo}`] = redondear2(minutos / 60 + horasAnteriores)
    }
    totales.minutosAtraso = aprobadas.reduce((s, f) => s + f.minutosDescuento, 0)

    if (liquidacion === null) {
        if (aprobadas.length > 0 || anteriores.length > 0) {
            avisos.push("La liquidación del periodo todavía no está calculada: el informe muestra horas y minutos, sin montos")
        }
        return { filas, anteriores, totales, liquidacion: null, avisos }
    }

    const valorHora = Number(liquidacion.valorHora)
    let desactualizado = false

    for (const recargo of RECARGOS) {
        const linea = liquidacion.lineas?.[recargo] ?? { cantidad: 0, monto: 0 }
        const dias = aprobadas.filter((f) => f.recargo === recargo)
        const deAnteriores = anteriores.filter((p) => p.recargo === recargo)
        const pesos = [...dias.map((f) => f.minutosExtra / 60), ...deAnteriores.map((p) => p.horas)]
        const factor = 1 + recargo / 100

        if (Math.abs(pesos.reduce((s, p) => s + p, 0) - Number(linea.cantidad ?? 0)) <= TOLERANCIA_HORAS) {
            const montos = repartir(Number(linea.monto ?? 0), pesos)
            dias.forEach((f, i) => { f.montoExtra = montos[i] })
            deAnteriores.forEach((p, i) => { p.monto = montos[dias.length + i] })
            totales[`monto${recargo}`] = Number(linea.monto ?? 0)
        } else {
            desactualizado = true
            dias.forEach((f) => { f.montoExtra = Math.round(f.minutosExtra / 60 * valorHora * factor) })
            deAnteriores.forEach((p) => { p.monto = Math.round(p.horas * valorHora * factor) })
            totales[`monto${recargo}`] = [...dias.map((f) => f.montoExtra), ...deAnteriores.map((p) => p.monto)].reduce((s, m) => s + m, 0)
        }
    }

    const lineaAtraso = liquidacion.lineas?.atraso ?? { cantidad: 0, monto: 0 }
    const conAtraso = aprobadas.filter((f) => f.minutosDescuento > 0)
    if (totales.minutosAtraso === Number(lineaAtraso.cantidad ?? 0)) {
        const montos = repartir(Number(lineaAtraso.monto ?? 0), conAtraso.map((f) => f.minutosDescuento))
        conAtraso.forEach((f, i) => { f.montoAtraso = montos[i] })
        totales.montoAtraso = Number(lineaAtraso.monto ?? 0)
    } else {
        desactualizado = true
        conAtraso.forEach((f) => { f.montoAtraso = Math.round(f.minutosDescuento / 60 * valorHora) })
        totales.montoAtraso = conAtraso.reduce((s, f) => s + f.montoAtraso, 0)
    }

    if (desactualizado) {
        avisos.push("Las horas o los atrasos del libro no cuadran con la liquidación (el libro cambió después de calcular): los montos por día son estimados con el valor hora de la liquidación. Vuelve a generar el resumen de asistencia y recalcula")
    }

    return {
        filas,
        anteriores,
        totales,
        liquidacion: { estado: liquidacion.estado, valorHora: redondear2(valorHora), desactualizado },
        avisos
    }
}

// Líneas de la liquidación que usa el informe: { 50, 100, atraso } con { cantidad, monto }.
function lineasDelInforme(lineas) {
    const de = (codigo) => {
        const delCodigo = lineas.filter((l) => l.codigo === codigo)
        return { cantidad: delCodigo.reduce((s, l) => s + Number(l.cantidad ?? 0), 0), monto: delCodigo.reduce((s, l) => s + Number(l.monto ?? 0), 0) }
    }
    return { 50: de("HORAS_EXTRA_50"), 100: de("HORAS_EXTRA_100"), atraso: de("DESCUENTO_ATRASOS") }
}

module.exports = { armarInformeHoras, lineasDelInforme, repartir, DIAS }
