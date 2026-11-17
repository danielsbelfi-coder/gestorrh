requiereLogin()

// Informe de horas extra y descuentos por atraso del periodo (ver «Informe de horas extra y atrasos» en el SPEC).
const selectorPeriodo = document.getElementById("periodo")
const selectorTrabajador = document.getElementById("trabajador")
const ESTADOS_LIQ = { calculada: "Calculada (borrador)", emitida: "Cerrada" }

const horas = (valor) => Number(valor).toLocaleString("es-CL", { maximumFractionDigits: 2 })
const montoOGuion = (monto) => (monto === null || monto === undefined ? "—" : pesos(monto))

const tabla = crearTabla({
    contenedor: "tablaResumen",
    textoBuscar: "Buscar por trabajador o RUT…",
    vacio: "Nadie tiene horas extra ni atrasos en este periodo.",
    columnas: [
        { titulo: "Trabajador", valor: (t) => t.nombre, html: (t) => `${escaparHtml(t.nombre)}<div class="nota">${escaparHtml(t.rut)}</div>` },
        { titulo: "H. extra 50 %", valor: (t) => t.totales.horas50, html: (t) => escaparHtml(horas(t.totales.horas50)), numero: true },
        { titulo: "Monto 50 %", valor: (t) => t.totales.monto50 ?? 0, html: (t) => escaparHtml(montoOGuion(t.totales.monto50)), numero: true },
        { titulo: "H. extra 100 %", valor: (t) => t.totales.horas100, html: (t) => escaparHtml(horas(t.totales.horas100)), numero: true },
        { titulo: "Monto 100 %", valor: (t) => t.totales.monto100 ?? 0, html: (t) => escaparHtml(montoOGuion(t.totales.monto100)), numero: true },
        { titulo: "Atraso (min)", valor: (t) => t.totales.minutosAtraso, numero: true },
        { titulo: "Descuento", valor: (t) => t.totales.montoAtraso ?? 0, html: (t) => escaparHtml(montoOGuion(t.totales.montoAtraso)), numero: true },
        {
            titulo: "Liquidación", valor: (t) => (t.liquidacion ? ESTADOS_LIQ[t.liquidacion.estado] ?? t.liquidacion.estado : "Sin calcular"),
            html: (t) => escaparHtml(t.liquidacion ? ESTADOS_LIQ[t.liquidacion.estado] ?? t.liquidacion.estado : "Sin calcular")
                + (t.avisos.length > 0 ? `<div class="nota peligro">${t.avisos.length} aviso(s)</div>` : "")
        },
        { titulo: "", orden: false, valor: () => "", html: (t) => `<button type="button" class="chico secundario" data-ver="${t.trabajador_id}">Ver días</button>` }
    ]
})

function tablaDias(t) {
    if (t.filas.length === 0) {
        return `<p class="texto-suave">Sin horas extra ni atrasos registrados en el libro.</p>`
    }
    return `
        <table class="tabla-anexos">
            <thead><tr><th>Fecha</th><th>Día</th><th>Horario</th><th>Entrada</th><th>Salida</th><th>Recargo</th><th>H. extra</th><th>Monto</th><th>Atraso (min)</th><th>Descuento</th><th>Marca</th></tr></thead>
            <tbody>${t.filas.map((f) => `
                <tr${f.aprobada ? "" : ` class="texto-suave"`}>
                    <td>${escaparHtml(fechaCorta(f.fecha))}</td>
                    <td>${escaparHtml(f.dia)}${f.tipoDia !== "Laboral" ? `<div class="nota">${escaparHtml(f.nombreFeriado ? `${f.tipoDia}: ${f.nombreFeriado}` : f.tipoDia)}</div>` : ""}</td>
                    <td>${escaparHtml(f.horario || "—")}</td>
                    <td>${escaparHtml(f.entrada)}</td>
                    <td>${escaparHtml(f.salida)}</td>
                    <td>${f.recargo ? `${f.recargo} %` : ""}</td>
                    <td>${f.horasExtra > 0 ? escaparHtml(horas(f.horasExtra)) : ""}</td>
                    <td>${f.horasExtra > 0 ? escaparHtml(montoOGuion(f.montoExtra)) : ""}</td>
                    <td>${f.minutosDescuento > 0 ? f.minutosDescuento + (f.compensado > 0 ? `<div class="nota">compensó ${f.compensado}</div>` : "") : ""}</td>
                    <td>${f.minutosDescuento > 0 ? escaparHtml(montoOGuion(f.montoAtraso)) : ""}</td>
                    <td>${f.aprobada ? "Aprobada" : "Pendiente (no suma)"}</td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

function detalleTrabajador(t) {
    const anteriores = t.anteriores.length === 0 ? "" : `
        <h3>Horas pendientes de meses anteriores pagadas en este periodo</h3>
        <ul>${t.anteriores.map((p) => `<li>${escaparHtml(p.mesOrigen)}: ${escaparHtml(horas(p.horas))} h al ${p.recargo} % · ${escaparHtml(montoOGuion(p.monto))}</li>`).join("")}</ul>`
    const avisos = t.avisos.length === 0 ? "" : `<ul class="lista-problemas">${t.avisos.map((a) => `<li>${escaparHtml(a)}</li>`).join("")}</ul>`
    const valorHora = t.liquidacion ? `Valor hora de la liquidación: ${escaparHtml(pesos(Math.round(t.liquidacion.valorHora)))}` : "Liquidación sin calcular"
    return `
        <details class="tarjeta plegable" id="detalle-${t.trabajador_id}">
            <summary>${escaparHtml(t.nombre)} · ${escaparHtml(t.rut)}</summary>
            <p class="texto-suave">${valorHora}</p>
            ${avisos}
            ${tablaDias(t)}
            ${anteriores}
        </details>`
}

function filtroTrabajador() {
    return selectorTrabajador.value ? `?trabajador_id=${encodeURIComponent(selectorTrabajador.value)}` : ""
}

async function cargarInforme() {
    limpiarMensajes()
    const periodo = selectorPeriodo.value
    if (!periodo) {
        tabla.mostrar([])
        document.getElementById("detalles").innerHTML = ""
        return
    }
    const resultado = await llamarApi(`/api/periodos-remuneracion/${periodo}/informe-horas${filtroTrabajador()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el informe")
        return
    }
    const trabajadores = resultado.datos.trabajadores
    tabla.mostrar(trabajadores)
    document.getElementById("detalles").innerHTML = trabajadores.map(detalleTrabajador).join("")
}

async function cargarTrabajadores() {
    const listas = await cargarListas(["/api/trabajadores", "/api/personas"])
    if (!listas) {
        return
    }
    const personaPorId = porId(listas[1])
    const trabajadores = deEmpresaActual(listas[0]).filter((t) => t.estado !== "postulante")
        .map((t) => ({ id: t.id, texto: personaPorId.get(t.persona_id) ? textoPersona(personaPorId.get(t.persona_id)) : `Trabajador #${t.id}` }))
        .sort((a, b) => a.texto.localeCompare(b.texto, "es"))
    llenarSelect(selectorTrabajador, trabajadores, "Todos (con horas extra o atrasos)")
}

document.getElementById("tablaResumen").addEventListener("click", function (evento) {
    const id = evento.target.closest("[data-ver]")?.dataset.ver
    if (!id) {
        return
    }
    const detalle = document.getElementById(`detalle-${id}`)
    detalle.open = true
    detalle.scrollIntoView({ behavior: "smooth", block: "start" })
})

document.getElementById("btnExcel").addEventListener("click", async function () {
    limpiarMensajes()
    if (!selectorPeriodo.value) {
        mensaje("error", "Elige un periodo")
        return
    }
    const resultado = await descargarArchivo(`/api/periodos-remuneracion/${selectorPeriodo.value}/informe-horas.xlsx${filtroTrabajador()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo descargar el Excel")
    }
})

selectorPeriodo.addEventListener("change", cargarInforme)
selectorTrabajador.addEventListener("change", cargarInforme)

document.addEventListener("empresa-lista", async function () {
    await cargarTrabajadores()
    await llenarSelectorPeriodos(selectorPeriodo)
    cargarInforme()
})
