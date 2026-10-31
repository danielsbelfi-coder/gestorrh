// Arma cada pendiente (firma o aprobación) a partir de su registro. Funciones puras: reciben objetos simples
// (los datos ya leídos de la base) y devuelven la fila que muestra la pantalla de Pendientes.
// La acción de cada fila apunta a la ruta que ya existe para firmar o aprobar ese registro.

const TIPOS = {
    contrato: "Contrato por firmar",
    anexo: "Anexo por firmar",
    marca: "Marca de asistencia",
    correccion: "Corrección de asistencia",
    variable: "Variable del mes",
    resumen: "Resumen de asistencia",
    saldo: "Liquidación con saldo desactualizado",
    finiquito_saldo: "Finiquito con saldo desactualizado",
    relacion: "Liquidación con otra relación del mes cambiada"
}

const TIPO_CONTRATO = { indefinido: "Indefinido", plazo_fijo: "Plazo fijo", obra_faena: "Obra o faena" }
const TIPO_MARCA = {
    normal: "Jornada", atraso: "Atraso", inasistencia: "Inasistencia", permiso_sin_goce: "Permiso sin goce",
    permiso_con_goce: "Permiso con goce", vacaciones: "Vacaciones", licencia_medica: "Licencia médica"
}

const dosDigitos = (numero) => String(numero).padStart(2, "0")

function fechaCorta(texto) {
    if (!texto) {
        return ""
    }
    const [anio, mes, dia] = String(texto).slice(0, 10).split("-")
    return `${dia}-${mes}-${anio}`
}

function nombrePersona(persona) {
    return [persona?.nombres, persona?.apellido_paterno, persona?.apellido_materno].filter(Boolean).join(" ")
}

function nombreEmpresa(empresa) {
    return empresa?.nombre_fantasia || empresa?.razon_social || ""
}

function base(tipo, id, trabajador, extra) {
    return {
        tipo,
        tipo_texto: TIPOS[tipo],
        id,
        clave: `${tipo}-${id}`,
        empresa_id: trabajador.empresa_id,
        empresa: nombreEmpresa(trabajador.Empresa),
        trabajador_id: trabajador.id,
        trabajador: nombrePersona(trabajador.Persona),
        ...extra
    }
}

const enlace = (pagina, parametros) => `${pagina}?${new URLSearchParams(parametros).toString()}`

function deContrato(contrato) {
    const trabajador = contrato.Trabajador
    return base("contrato", contrato.id, trabajador, {
        detalle: `${TIPO_CONTRATO[contrato.tipo_contrato] ?? contrato.tipo_contrato}, desde el ${fechaCorta(contrato.fecha_inicio)}`,
        fecha: contrato.fecha_inicio,
        enlace: enlace("trabajador.html", { id: trabajador.id, empresa: trabajador.empresa_id }),
        accion: { texto: "Firmar", metodo: "PATCH", ruta: `/api/contratos/${contrato.id}/firmar`, cuerpo: {} },
        permiso: "FIRMAR_CONTRATO"
    })
}

function deAnexo(anexo) {
    const trabajador = anexo.ContratoTrabajo.Trabajador
    return base("anexo", anexo.id, trabajador, {
        detalle: `${anexo.campo_modificado}: ${anexo.valor_anterior ?? "(vacío)"} → ${anexo.valor_nuevo}, rige desde el ${fechaCorta(anexo.fecha_vigencia)}`,
        fecha: anexo.fecha_vigencia,
        enlace: enlace("trabajador.html", { id: trabajador.id, empresa: trabajador.empresa_id }),
        accion: { texto: "Firmar", metodo: "PATCH", ruta: `/api/contratos/${anexo.contrato_id}/anexos/${anexo.id}/firmar`, cuerpo: {} },
        permiso: "FIRMAR_ANEXO"
    })
}

function horario(marca) {
    const entrada = marca.hora_entrada ? String(marca.hora_entrada).slice(0, 5) : null
    const salida = marca.hora_salida ? String(marca.hora_salida).slice(0, 5) : null
    return entrada || salida ? ` ${entrada ?? "--:--"} a ${salida ?? "--:--"}` : ""
}

function deMarca(marca) {
    const trabajador = marca.Trabajador
    return base("marca", marca.id, trabajador, {
        detalle: `${TIPO_MARCA[marca.tipo] ?? marca.tipo} del ${fechaCorta(marca.fecha)}${horario(marca)}`,
        fecha: marca.fecha,
        enlace: enlace("libro.html", { trabajador: trabajador.id, mes: String(marca.fecha).slice(0, 7), empresa: trabajador.empresa_id }),
        accion: { texto: "Aprobar", metodo: "PATCH", ruta: `/api/asistencias/${marca.id}/aprobacion`, cuerpo: { estado: "aprobada" } },
        permiso: "APROBAR_ASISTENCIA"
    })
}

function deCorreccion(correccion) {
    const marca = correccion.Asistencia
    const trabajador = marca.Trabajador
    return base("correccion", correccion.id, trabajador, {
        detalle: `Cambiar ${correccion.campo_modificado} de la marca del ${fechaCorta(marca.fecha)}: ${correccion.valor_anterior ?? "(vacío)"} → ${correccion.valor_nuevo}`,
        fecha: marca.fecha,
        enlace: enlace("asistencias.html", { buscar: nombrePersona(trabajador.Persona), empresa: trabajador.empresa_id }),
        accion: { texto: "Aprobar", metodo: "PATCH", ruta: `/api/asistencias/${marca.id}/correcciones/${correccion.id}/aprobar`, cuerpo: {} },
        permiso: "APROBAR_CORRECCION"
    })
}

const nombreMes = (periodo) => `${dosDigitos(periodo.mes)}-${periodo.anio}`
const inicioDelPeriodo = (periodo) => `${periodo.anio}-${dosDigitos(periodo.mes)}-01`

function deVariable(variable) {
    const periodo = variable.PeriodoRemuneracion
    const valor = variable.cantidad !== null && variable.cantidad !== undefined && Number(variable.cantidad) > 0
        ? `${Number(variable.cantidad).toLocaleString("es-CL")} h`
        : `$${Number(variable.monto ?? 0).toLocaleString("es-CL")}`
    return base("variable", variable.id, variable.Trabajador, {
        detalle: `${variable.ConceptoRemuneracion?.nombre ?? "Variable"}: ${valor} (${nombreMes(periodo)})${variable.glosa ? ` · ${variable.glosa}` : ""}`,
        fecha: inicioDelPeriodo(periodo),
        enlace: enlace("variables.html", { periodo: periodo.id, empresa: periodo.empresa_id }),
        accion: { texto: "Aprobar", metodo: "PATCH", ruta: `/api/variables/${variable.id}/aprobar`, cuerpo: {} },
        permiso: "APROBAR_VARIABLES"
    })
}

function deResumen(resumen) {
    const periodo = resumen.PeriodoRemuneracion
    const partes = [
        [resumen.dias_inasistencia, "inasistencia"], [resumen.dias_licencia_medica, "licencia"],
        [resumen.dias_permiso_sin_goce, "permiso sin goce"], [resumen.dias_vacaciones, "vacaciones"]
    ].filter(([dias]) => Number(dias) > 0).map(([dias, texto]) => `${dias} d ${texto}`)
    if (Number(resumen.minutos_atraso) > 0) {
        partes.push(`${resumen.minutos_atraso} min de atraso`)
    }
    return base("resumen", resumen.id, resumen.Trabajador, {
        detalle: `Mes ${nombreMes(periodo)}: ${partes.length > 0 ? partes.join(", ") : "sin ausencias ni atrasos"}`,
        fecha: inicioDelPeriodo(periodo),
        enlace: enlace("resumenes.html", { periodo: periodo.id, empresa: periodo.empresa_id }),
        accion: { texto: "Aprobar", metodo: "PATCH", ruta: `/api/resumenes-asistencia/${resumen.id}/aprobar`, cuerpo: {} },
        permiso: "APROBAR_VARIABLES"
    })
}

// Liquidación calculada con un saldo de pago en exceso que después cambió (se recalculó el mes anterior).
// En borrador se vuelve a calcular; emitida, se recalcula como una versión nueva con un motivo fijo.
const MOTIVO_SALDO = "Cambió el saldo de pago en exceso del mes anterior"

function deSaldo(liquidacion, saldo) {
    const periodo = liquidacion.PeriodoRemuneracion
    const pesos = (monto) => `$${Number(monto).toLocaleString("es-CL")}`
    const ruta = `/api/periodos-remuneracion/${periodo.id}/liquidaciones`
    return base("saldo", liquidacion.id, liquidacion.Trabajador, {
        detalle: `Mes ${nombreMes(periodo)}: se calculó con un saldo anterior de ${pesos(saldo.guardado)} y ahora es ${pesos(saldo.actual)}`,
        fecha: inicioDelPeriodo(periodo),
        enlace: enlace("liquidaciones.html", { periodo: periodo.id, empresa: periodo.empresa_id }),
        accion: liquidacion.estado === "calculada"
            ? { texto: "Recalcular", metodo: "POST", ruta, cuerpo: { trabajador_id: liquidacion.trabajador_id } }
            : { texto: "Recalcular", metodo: "POST", ruta: `${ruta}/${liquidacion.id}/recalcular`, cuerpo: { motivo: MOTIVO_SALDO } },
        permiso: "CALCULAR_LIQUIDACION"
    })
}

// Liquidación de la segunda relación del mes cuya relación anterior cambió (o se calculó después).
const MOTIVO_RELACION = "Cambió la otra relación laboral de la persona en el mes"

function deRelacion(liquidacion) {
    const periodo = liquidacion.PeriodoRemuneracion
    const ruta = `/api/periodos-remuneracion/${periodo.id}/liquidaciones`
    return base("relacion", liquidacion.id, liquidacion.Trabajador, {
        detalle: `Mes ${nombreMes(periodo)}: la persona tiene otra relación laboral en el mes que cambió; los topes y el impuesto se comparten`,
        fecha: inicioDelPeriodo(periodo),
        enlace: enlace("liquidaciones.html", { periodo: periodo.id, empresa: periodo.empresa_id }),
        accion: liquidacion.estado === "calculada"
            ? { texto: "Recalcular", metodo: "POST", ruta, cuerpo: { trabajador_id: liquidacion.trabajador_id } }
            : { texto: "Recalcular", metodo: "POST", ruta: `${ruta}/${liquidacion.id}/recalcular`, cuerpo: { motivo: MOTIVO_RELACION } },
        permiso: "CALCULAR_LIQUIDACION"
    })
}

// Finiquito (calculado o emitido) que descontó un saldo de pago en exceso distinto del que hoy deja la liquidación del mes.
function deFiniquitoSaldo(finiquito, saldo) {
    const trabajador = finiquito.Trabajador
    const pesos = (monto) => `$${Number(monto).toLocaleString("es-CL")}`
    return base("finiquito_saldo", finiquito.id, trabajador, {
        detalle: `Término ${fechaCorta(trabajador.fecha_termino)}: se calculó con un saldo de pago en exceso de ${pesos(saldo.guardado)} y la liquidación ahora deja ${pesos(saldo.actual)}`,
        fecha: trabajador.fecha_termino,
        enlace: enlace("finiquitos.html", { buscar: nombrePersona(trabajador.Persona), empresa: trabajador.empresa_id }),
        accion: { texto: "Recalcular", metodo: "POST", ruta: `/api/finiquitos/${finiquito.id}/recalcular`, cuerpo: {} },
        permiso: "GESTIONAR_FINIQUITOS"
    })
}

// rolesPorEmpresa: { [empresa_id]: "ADMIN" | "JEFE_RRHH" | "RRHH" }. Sin rol en esa empresa (por ejemplo soporte), no actúa.
// permisos: la matriz PERMISOS de src/shared/permisos.js (se recibe como parámetro para que esta función no toque la base).
function puedeActuar(item, rolesPorEmpresa, permisos) {
    const rol = rolesPorEmpresa[item.empresa_id]
    return Boolean(rol) && (permisos[item.permiso] ?? []).includes(rol)
}

// Más antiguos primero: lo que lleva más tiempo esperando va arriba.
function ordenar(items) {
    return [...items].sort((a, b) => String(a.fecha ?? "").localeCompare(String(b.fecha ?? "")) || a.clave.localeCompare(b.clave))
}

module.exports = { TIPOS, MOTIVO_SALDO, deContrato, deAnexo, deMarca, deCorreccion, deVariable, deResumen, deSaldo, deRelacion, deFiniquitoSaldo, puedeActuar, ordenar, nombrePersona, fechaCorta }
