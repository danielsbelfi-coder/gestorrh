// Informe de horas extra y descuentos por atraso del periodo (todos los trabajadores o uno). Ver «Informe de horas
// extra y atrasos» en el SPEC. Devuelve JSON para la pantalla y arma el Excel.
const { Liquidacion, LiquidacionLinea, VariablePeriodo, ConceptoRemuneracion, Persona } = require("../shared/associations.js")
const { obtenerPeriodoPorId, trabajadoresDelPeriodo } = require("./periodo_remuneracion.service.js")
const { libroDelTrabajador } = require("../asistencia/libro_asistencia.service.js")
const { exigirRol, PERMISOS } = require("../shared/permisos.js")
const { armarInformeHoras, lineasDelInforme } = require("./informe_horas.js")
const { crearXlsx } = require("../shared/xlsx_minimo.js")

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const ESTADOS_LIQUIDACION = { calculada: "Calculada (borrador)", emitida: "Cerrada" }
const nombreDe = (p) => [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(" ")

async function informeDelTrabajador(periodo, trabajador) {
    const [libro, persona, variables, liquidacion] = await Promise.all([
        libroDelTrabajador(trabajador, periodo.anio, periodo.mes),
        Persona.findByPk(trabajador.persona_id),
        VariablePeriodo.findAll({ where: { periodo_id: periodo.id, trabajador_id: trabajador.id, estado: "aprobada" }, include: [ConceptoRemuneracion] }),
        Liquidacion.findOne({ where: { periodo_id: periodo.id, trabajador_id: trabajador.id, vigente: true }, include: [LiquidacionLinea] })
    ])

    // Horas pendientes de meses cerrados: variables aprobadas de horas extra que no vienen del libro.
    const pendientes = variables
        .filter((v) => v.fuente !== "asistencia" && ["HORAS_EXTRA_50", "HORAS_EXTRA_100"].includes(v.ConceptoRemuneracion?.codigo))
        .map((v) => ({ recargo: Number(v.ConceptoRemuneracion.recargo_hora_extra), horas: Number(v.cantidad ?? 0), mesOrigen: v.mes_origen }))

    const informe = armarInformeHoras({
        libro,
        pendientes,
        liquidacion: liquidacion === null ? null : {
            estado: liquidacion.estado,
            valorHora: Number(liquidacion.detalle_calculo?.valorHoraOrdinaria ?? 0),
            lineas: lineasDelInforme(liquidacion.LiquidacionLineas.map((l) => l.toJSON()))
        }
    })

    return {
        trabajador_id: trabajador.id,
        rut: `${persona.rut}-${String(persona.dv).toUpperCase()}`,
        nombre: nombreDe(persona),
        ...informe,
        avisos: [...(libro.advertencias ?? []), ...informe.avisos]
    }
}

// opciones.trabajador_id: solo ese trabajador (aunque no tenga horas). Sin él, solo los que tienen algo que mostrar.
async function informeHoras(periodoId, opciones, empresasPermitidas, usuarioId) {
    const periodo = await obtenerPeriodoPorId(periodoId, empresasPermitidas)
    await exigirRol(usuarioId, periodo.empresa_id, PERMISOS.CALCULAR_LIQUIDACION)

    const soloUno = opciones?.trabajador_id ? Number(opciones.trabajador_id) : null
    const trabajadores = (await trabajadoresDelPeriodo(periodo)).filter((t) => soloUno === null || t.id === soloUno)

    const informes = []
    for (const trabajador of trabajadores) {
        const informe = await informeDelTrabajador(periodo, trabajador)
        if (soloUno !== null || informe.filas.length > 0 || informe.anteriores.length > 0) {
            informes.push(informe)
        }
    }
    informes.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))

    return { periodo: { id: periodo.id, anio: periodo.anio, mes: periodo.mes, estado: periodo.estado }, trabajadores: informes }
}

const fechaCorta = (iso) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`
const montoOVacio = (monto) => (monto === null || monto === undefined ? "" : monto)

// Excel: hoja «Resumen» (una fila por trabajador), «Detalle por día» y «Meses anteriores» (horas pendientes pagadas en el periodo).
async function excelInformeHoras(periodoId, opciones, empresasPermitidas, usuarioId) {
    const { periodo, trabajadores } = await informeHoras(periodoId, opciones, empresasPermitidas, usuarioId)

    const resumen = [["RUT", "Nombre", "Horas extra 50 %", "Monto 50 %", "Horas extra 100 %", "Monto 100 %", "Minutos de atraso", "Descuento por atrasos", "Liquidación", "Valor hora", "Avisos"]]
    const detalle = [["RUT", "Nombre", "Fecha", "Día", "Tipo de día", "Horario", "Entrada", "Salida", "Recargo", "Horas extra", "Monto horas extra", "Atraso (min)", "Compensado (min)", "Salida anticipada (min)", "Minutos descontados", "Descuento", "Marca", "Observaciones"]]
    const anteriores = [["RUT", "Nombre", "Mes de origen", "Recargo", "Horas", "Monto"]]

    for (const t of trabajadores) {
        resumen.push([t.rut, t.nombre, t.totales.horas50, montoOVacio(t.totales.monto50), t.totales.horas100, montoOVacio(t.totales.monto100),
            t.totales.minutosAtraso, montoOVacio(t.totales.montoAtraso),
            t.liquidacion ? ESTADOS_LIQUIDACION[t.liquidacion.estado] ?? t.liquidacion.estado : "Sin calcular",
            t.liquidacion ? t.liquidacion.valorHora : "", t.avisos.join(" | ")])
        for (const f of t.filas) {
            detalle.push([t.rut, t.nombre, fechaCorta(f.fecha), f.dia, f.nombreFeriado ? `${f.tipoDia} (${f.nombreFeriado})` : f.tipoDia, f.horario, f.entrada, f.salida,
                f.recargo ? `${f.recargo} %` : "", f.horasExtra, montoOVacio(f.montoExtra), f.atraso, f.compensado, f.salidaAnticipada, f.minutosDescuento,
                montoOVacio(f.montoAtraso), f.aprobada ? "Aprobada" : "Pendiente (no suma)", f.observacion])
        }
        for (const p of t.anteriores) {
            anteriores.push([t.rut, t.nombre, p.mesOrigen, `${p.recargo} %`, p.horas, montoOVacio(p.monto)])
        }
    }

    const archivo = await crearXlsx([
        { nombre: "Resumen", filas: resumen, anchos: [13, 30, 10, 12, 10, 12, 10, 12, 18, 10, 60] },
        { nombre: "Detalle por día", filas: detalle, anchos: [13, 30, 11, 10, 14, 12, 8, 8, 8, 8, 12, 8, 10, 10, 10, 11, 18, 40] },
        { nombre: "Meses anteriores", filas: anteriores, anchos: [13, 30, 12, 8, 8, 12] }
    ])
    const mm = String(periodo.mes).padStart(2, "0")
    return { archivo, nombre: `horas-extra-atrasos-${periodo.anio}-${mm}.xlsx`, titulo: `${MESES[periodo.mes - 1]} ${periodo.anio}` }
}

module.exports = { informeHoras, excelInformeHoras }
