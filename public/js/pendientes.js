// Pendientes: todo lo que espera firma o aprobación en las empresas del usuario.
// Las acciones usan las mismas rutas que cada pantalla; el servidor revalida permisos y estados.
requiereLogin()

const mensajeError = document.getElementById("mensajeError")
const mensajeInfo = document.getElementById("mensajeInfo")
const botonActuar = document.getElementById("actuarSeleccionados")
const seleccionados = new Set()
let pendientes = []
let tabla = null

function fechaCorta(texto) {
    if (!texto) {
        return ""
    }
    const [anio, mes, dia] = String(texto).slice(0, 10).split("-")
    return `${dia}-${mes}-${anio}`
}

function porClave(clave) {
    return pendientes.find((item) => item.clave === clave)
}

function actualizarBotonMasivo() {
    botonActuar.disabled = seleccionados.size === 0
    botonActuar.textContent = seleccionados.size === 0
        ? "Firmar o aprobar los seleccionados"
        : `Firmar o aprobar los seleccionados (${seleccionados.size})`
}

function crearTablaPendientes(conCasillas) {
    const tipos = [...new Map(pendientes.map((item) => [item.tipo, item.tipo_texto])).entries()]
    const empresas = [...new Map(pendientes.map((item) => [String(item.empresa_id), item.empresa])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1], "es"))

    return crearTabla({
        contenedor: "tablaPendientes",
        textoBuscar: "Buscar por trabajador, empresa o detalle…",
        vacio: "No hay nada pendiente.",
        columnas: [
            // La columna de casillas solo aparece si el usuario puede firmar o aprobar algo.
            ...(conCasillas ? [{
                titulo: "✓", orden: false, valor: () => "",
                html: (item) => item.puede_actuar
                    ? `<input type="checkbox" data-clave="${escaparHtml(item.clave)}" aria-label="Seleccionar"${seleccionados.has(item.clave) ? " checked" : ""}>`
                    : ""
            }] : []),
            { titulo: "Tipo", valor: (item) => item.tipo_texto, html: (item) => `<span class="insignia ${item.tipo === "contrato" || item.tipo === "anexo" ? "info" : "advertencia"}">${escaparHtml(item.tipo_texto)}</span>` },
            { titulo: "Empresa", valor: (item) => item.empresa },
            { titulo: "Trabajador", valor: (item) => item.trabajador },
            { titulo: "Detalle", valor: (item) => item.detalle },
            { titulo: "Fecha", valor: (item) => item.fecha ?? "", html: (item) => `<span class="sin-corte">${escaparHtml(fechaCorta(item.fecha))}</span>` },
            {
                titulo: "", orden: false, valor: () => "",
                html: (item) => `<a class="boton chico secundario" href="${escaparHtml(item.enlace)}">Ver</a>`
                    + (item.puede_actuar ? ` <button type="button" class="chico" data-actuar="${escaparHtml(item.clave)}">${escaparHtml(item.accion.texto)}</button>` : "")
            }
        ],
        filtros: [
            { titulo: "Tipo", valor: (item) => item.tipo, opciones: tipos },
            ...(empresas.length > 1 ? [{ titulo: "Empresa", valor: (item) => String(item.empresa_id), opciones: empresas }] : [])
        ]
    })
}

async function cargar() {
    const resultado = await llamarApi("/api/pendientes")
    if (resultado.status !== 200) {
        mensajeError.textContent = resultado.datos?.error ?? "No se pudieron cargar los pendientes"
        return
    }
    pendientes = resultado.datos.items
    // Se olvida lo seleccionado que ya no está (otro usuario lo aprobó, o se aprobó recién).
    for (const clave of [...seleccionados]) {
        if (!porClave(clave)?.puede_actuar) {
            seleccionados.delete(clave)
        }
    }

    const { total, accionables } = resultado.datos
    document.getElementById("resumen").textContent = total === 0
        ? "No hay nada esperando firma o aprobación."
        : accionables > 0
            ? `${total} pendiente${total === 1 ? "" : "s"}; ${accionables} espera${accionables === 1 ? "" : "n"} tu firma o aprobación. Los más antiguos están arriba.`
            : `${total} pendiente${total === 1 ? "" : "s"}. Esperan la firma o aprobación de la jefatura (ADMIN o JEFE_RRHH).`
    document.getElementById("accionesMasivas").hidden = accionables === 0

    tabla = crearTablaPendientes(accionables > 0)
    tabla.mostrar(pendientes)
    actualizarBotonMasivo()
    actualizarContadorPendientes()
}

// Ejecuta la acción de un pendiente. Devuelve null si salió bien o el texto del error.
async function actuar(item) {
    const resultado = await llamarApi(item.accion.ruta, { method: item.accion.metodo, body: JSON.stringify(item.accion.cuerpo ?? {}) })
    return resultado.status === 200 || resultado.status === 201 ? null : (resultado.datos?.error ?? `Error ${resultado.status}`)
}

document.getElementById("tablaPendientes").addEventListener("change", (evento) => {
    const casilla = evento.target.closest("input[data-clave]")
    if (!casilla) {
        return
    }
    if (casilla.checked) {
        seleccionados.add(casilla.dataset.clave)
    } else {
        seleccionados.delete(casilla.dataset.clave)
    }
    actualizarBotonMasivo()
})

document.getElementById("tablaPendientes").addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-actuar]")
    if (!boton) {
        return
    }
    const item = porClave(boton.dataset.actuar)
    if (!item || !confirm(`${item.accion.texto}: ${item.tipo_texto.toLowerCase()} de ${item.trabajador}\n${item.detalle}\n\n¿Continuar?`)) {
        return
    }
    mensajeError.textContent = ""
    mensajeInfo.textContent = ""
    boton.disabled = true
    const error = await actuar(item)
    if (error) {
        mensajeError.textContent = `${item.tipo_texto} de ${item.trabajador}: ${error}`
    } else {
        mensajeInfo.textContent = `Listo: ${item.tipo_texto.toLowerCase()} de ${item.trabajador}.`
    }
    seleccionados.delete(item.clave)
    cargar()
})

document.getElementById("seleccionarVisibles").addEventListener("click", () => {
    for (const item of tabla.visibles()) {
        if (item.puede_actuar) {
            seleccionados.add(item.clave)
        }
    }
    tabla.mostrar(pendientes)
    actualizarBotonMasivo()
})

botonActuar.addEventListener("click", async () => {
    const lista = [...seleccionados].map(porClave).filter((item) => item?.puede_actuar)
    if (lista.length === 0 || !confirm(`¿Firmar o aprobar ${lista.length} pendiente${lista.length === 1 ? "" : "s"}?\n\nRevisa antes los que tengan dudas con el botón «Ver».`)) {
        return
    }
    mensajeError.textContent = ""
    mensajeInfo.textContent = ""
    botonActuar.disabled = true
    botonActuar.textContent = "Procesando…"

    const errores = []
    let listos = 0
    // De a uno: cada acción pasa por las mismas validaciones que en su pantalla.
    for (const item of lista) {
        const error = await actuar(item)
        if (error) {
            errores.push(`${item.tipo_texto} de ${item.trabajador}: ${error}`)
        } else {
            listos++
            seleccionados.delete(item.clave)
        }
    }

    mensajeInfo.textContent = `${listos} listo${listos === 1 ? "" : "s"}.`
    mensajeError.textContent = errores.length > 0 ? `No se pudieron procesar ${errores.length}: ${errores.join(" · ")}` : ""
    cargar()
})

document.addEventListener("usuario-listo", cargar)
