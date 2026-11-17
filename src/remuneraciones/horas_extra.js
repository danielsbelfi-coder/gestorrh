// Horas extra con un solo origen (funciones puras, sin base de datos). Ver «Correcciones tras la prueba 1», A1, en el SPEC.
//
// - Las horas extra del mes se registran SOLO en el libro de asistencia (cada marca al 50 % o al 100 %); al generar el
//   resumen se proponen como variables con fuente "asistencia".
// - La variable manual de horas extra es solo para horas pendientes de un mes ya cerrado: lleva mes de origen
//   obligatorio, anterior al mes del periodo.
// Así un mismo mes nunca suma horas extra desde el libro y desde una variable a la vez.

const RECARGOS = [50, 100]

const esHoraExtra = (concepto) => concepto?.recargo_hora_extra !== null && concepto?.recargo_hora_extra !== undefined

function claveMes(anio, mes) {
    return `${anio}-${String(mes).padStart(2, "0")}`
}

// "AAAA-MM" o "AAAA-MM-DD" → "AAAA-MM-01". Lanza un Error con el motivo si falta, es inválido o no es anterior al periodo.
function leerMesOrigen(valor, periodo) {
    const texto = String(valor ?? "").trim()
    const coincidencia = /^(\d{4})-(\d{2})(-\d{2})?$/.exec(texto)
    if (texto === "") {
        throw new Error("Indica el mes de origen de las horas extra. Las horas extra del mes se registran en el libro de asistencia; esta variable es solo para horas pendientes de un mes ya cerrado")
    }
    if (!coincidencia || Number(coincidencia[2]) < 1 || Number(coincidencia[2]) > 12) {
        throw new Error("El mes de origen debe tener el formato AAAA-MM")
    }
    const clave = `${coincidencia[1]}-${coincidencia[2]}`
    if (clave >= claveMes(periodo.anio, periodo.mes)) {
        throw new Error("El mes de origen debe ser anterior al mes del periodo: las horas extra de este mes se registran en el libro de asistencia (al 50 % o al 100 %)")
    }
    return `${clave}-01`
}

// Revisa las variables aprobadas de un trabajador antes de calcular. variables: [{ concepto, fuente, mes_origen }].
// Devuelve la lista de problemas (vacía si está bien). Una variable de horas extra que no viene del libro tiene que
// tener un mes de origen anterior al periodo; si no, el mes sumaría horas desde los dos orígenes.
function problemasOrigenHorasExtra(variables, periodo) {
    const mesPeriodo = claveMes(periodo.anio, periodo.mes)
    const problemas = []
    for (const variable of variables) {
        if (!esHoraExtra(variable.concepto) || variable.fuente === "asistencia") {
            continue
        }
        const origen = variable.mes_origen ? String(variable.mes_origen).slice(0, 7) : null
        if (origen === null) {
            problemas.push(`La variable «${variable.concepto.nombre}» (${Number(variable.cantidad ?? 0)} h) no indica el mes de origen: las horas extra del mes se registran en el libro de asistencia. Si son de un mes ya cerrado, devuélvala a pendiente e indique el mes; si son de este mes, elimínela y anótelas en el libro`)
        } else if (origen >= mesPeriodo) {
            problemas.push(`La variable «${variable.concepto.nombre}» (${Number(variable.cantidad ?? 0)} h) tiene como origen el mismo mes del periodo: esas horas van en el libro de asistencia`)
        }
    }
    return problemas
}

// Horas por recargo de las marcas aprobadas del libro: { 50: horas, 100: horas } (2 decimales).
function horasPorRecargo(totales) {
    return {
        50: Math.round(Number(totales.minutos_extra_50 ?? 0) / 60 * 100) / 100,
        100: Math.round(Number(totales.minutos_extra_100 ?? 0) / 60 * 100) / 100
    }
}

const textoHoras = (horas) => `${String(horas).replace(".", ",")} h`

// Avisos cuando el libro de asistencia (marcas aprobadas) ya no coincide con lo que se va a liquidar: las horas extra
// aprobadas desde la asistencia o el resumen aprobado. Pasa si se cambió una marca después de aprobar (caso de la prueba
// 2: 1 hora extra aprobada, luego la marca se cambió a 2 horas). Ver «Libro y variables desincronizados» en el SPEC.
// horasLibro: { 50, 100 } (horasPorRecargo). aprobadas: variables aprobadas ({ concepto, cantidad, fuente }).
// resumen: resumen aprobado o null. totales: totales del libro.
function avisosLibroDesincronizado({ horasLibro, aprobadas, resumen, totales }) {
    const avisos = []
    const delLibro = aprobadas.filter((v) => v.fuente === "asistencia" && esHoraExtra(v.concepto))
    for (const recargo of RECARGOS) {
        const aprobado = Math.round(delLibro.filter((v) => Number(v.concepto.recargo_hora_extra) === recargo)
            .reduce((s, v) => s + Number(v.cantidad ?? 0), 0) * 100) / 100
        if (aprobado !== horasLibro[recargo]) {
            avisos.push(`Horas extra al ${recargo} %: el libro de asistencia tiene ${textoHoras(horasLibro[recargo])} y lo aprobado es ${textoHoras(aprobado)}. ` +
                "En Resumen de asistencia, «Generar desde la asistencia» reemplaza la propuesta; apruébala y vuelve a calcular")
        }
    }
    if (resumen && resumen.fuente === "asistencia") {
        const campos = [["minutos_atraso", "minutos de atraso"], ["dias_inasistencia", "días de inasistencia"], ["dias_permiso_sin_goce", "días de permiso sin goce"], ["dias_vacaciones", "días de vacaciones"]]
        const distintos = campos.filter(([campo]) => Number(resumen[campo] ?? 0) !== Number(totales[campo] ?? 0))
        if (distintos.length > 0) {
            avisos.push(`El resumen de asistencia aprobado no coincide con el libro (${distintos.map(([campo, nombre]) => `${nombre}: ${Number(resumen[campo] ?? 0)} aprobados, ${Number(totales[campo] ?? 0)} en el libro`).join("; ")}). ` +
                "Si el libro es el correcto: Desaprobar el resumen, «Generar desde la asistencia», aprobar y volver a calcular")
        }
    }
    return avisos
}

module.exports = { RECARGOS, esHoraExtra, leerMesOrigen, problemasOrigenHorasExtra, horasPorRecargo, claveMes, avisosLibroDesincronizado }
