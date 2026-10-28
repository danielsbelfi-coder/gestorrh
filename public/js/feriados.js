requiereLogin()

const REGIONES = {
    1: "Tarapacá", 2: "Antofagasta", 3: "Atacama", 4: "Coquimbo", 5: "Valparaíso", 6: "O'Higgins", 7: "Maule", 8: "Biobío",
    9: "La Araucanía", 10: "Los Lagos", 11: "Aysén", 12: "Magallanes", 13: "Metropolitana", 14: "Los Ríos", 15: "Arica y Parinacota", 16: "Ñuble"
}
const TEXTO_ALCANCE = { nacional: "Nacional", regional: "Regional", comunal: "Comunal" }

const campoAnio = document.getElementById("anio")
const formulario = document.getElementById("formFeriado")
let esSoporte = false
let feriados = []
let feriadoEnEdicion = null

function diaDeLaSemana(fecha) {
    const nombre = new Date(`${fecha}T00:00:00Z`).toLocaleDateString("es-CL", { weekday: "long", timeZone: "UTC" })
    return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

function lugar(f) {
    if (f.alcance === "regional") {
        return `Región de ${REGIONES[f.region] ?? f.region}`
    }
    if (f.alcance === "comunal") {
        return COMUNAS[f.comuna] ?? f.comuna
    }
    return "Todo el país"
}

function cae(f) {
    const dia = new Date(`${f.fecha}T00:00:00Z`).getUTCDay()
    return dia === 0 || dia === 6
}

const tabla = crearTabla({
    contenedor: "tablaFeriados",
    textoBuscar: "Buscar feriado o lugar…",
    vacio: "No hay feriados cargados para este año. Soporte debe cargarlos.",
    columnas: [
        { titulo: "Fecha", valor: (f) => f.fecha, html: (f) => escaparHtml(fechaCorta(f.fecha)) },
        {
            titulo: "Día", valor: (f) => diaDeLaSemana(f.fecha),
            html: (f) => cae(f) ? `${escaparHtml(diaDeLaSemana(f.fecha))} <span class="texto-suave">(fin de semana)</span>` : escaparHtml(diaDeLaSemana(f.fecha))
        },
        { titulo: "Feriado", valor: (f) => f.nombre },
        { titulo: "Alcance", valor: (f) => TEXTO_ALCANCE[f.alcance] },
        { titulo: "Rige en", valor: (f) => lugar(f) },
        { titulo: "Irrenunciable", valor: (f) => f.irrenunciable ? "Sí" : "No" },
        {
            titulo: "", orden: false, valor: () => "",
            html: (f) => esSoporte
                ? `<button type="button" class="chico secundario" data-editar="${f.id}">Editar</button>
                   <button type="button" class="chico peligro" data-eliminar="${f.id}">Eliminar</button>`
                : ""
        }
    ],
    filtros: [{ titulo: "Alcance", valor: (f) => f.alcance, opciones: Object.entries(TEXTO_ALCANCE) }]
})

// ---------- Datos ----------

async function cargarFeriados() {
    const resultado = await llamarApi(`/api/feriados?anio=${Number(campoAnio.value)}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar los feriados")
        return
    }
    feriados = resultado.datos
    tabla.mostrar(feriados)
}

function cambiarAnio(delta) {
    campoAnio.value = Number(campoAnio.value) + delta
    limpiarMensajes()
    cargarFeriados()
}
document.getElementById("anioAnterior").addEventListener("click", () => cambiarAnio(-1))
document.getElementById("anioSiguiente").addEventListener("click", () => cambiarAnio(1))
campoAnio.addEventListener("change", () => { limpiarMensajes(); cargarFeriados() })

// ---------- Formulario (solo soporte) ----------

llenarSelect(document.getElementById("region"), Object.entries(REGIONES).map(([id, texto]) => ({ id, texto })), "Elige una región")
llenarBuscador(document.getElementById("comuna"), Object.entries(COMUNAS).map(([codigo, nombre]) => ({ id: codigo, texto: `${nombre} (${codigo})` })))

function mostrarCamposAlcance() {
    const alcance = document.getElementById("alcance").value
    document.getElementById("campoRegion").hidden = alcance !== "regional"
    document.getElementById("campoComuna").hidden = alcance !== "comunal"
    document.getElementById("region").required = alcance === "regional"
}
document.getElementById("alcance").addEventListener("change", mostrarCamposAlcance)

function salirDeEdicion() {
    feriadoEnEdicion = null
    formulario.reset()
    mostrarCamposAlcance()
    document.getElementById("tituloPanel").textContent = "＋ Nuevo feriado (soporte)"
    document.getElementById("botonGuardar").textContent = "Crear feriado"
    document.getElementById("cancelarEdicion").hidden = true
}

document.getElementById("cancelarEdicion").addEventListener("click", () => {
    salirDeEdicion()
    document.getElementById("panelSoporte").removeAttribute("open")
})

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const alcance = document.getElementById("alcance").value
    const campoComuna = document.getElementById("comuna")
    const comuna = valorBuscador(campoComuna)
    if (alcance === "comunal" && comuna === null) {
        mensaje("error", "Elige una comuna de la lista de sugerencias")
        return
    }

    const cuerpo = {
        fecha: document.getElementById("fecha").value,
        nombre: document.getElementById("nombre").value.trim(),
        alcance,
        region: alcance === "regional" ? Number(document.getElementById("region").value) : null,
        comuna: alcance === "comunal" ? comuna : null,
        irrenunciable: document.getElementById("irrenunciable").checked
    }

    const resultado = feriadoEnEdicion
        ? await llamarApi(`/api/feriados/${feriadoEnEdicion.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
        : await llamarApi("/api/feriados", { method: "POST", body: JSON.stringify(cuerpo) })

    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar el feriado")
        return
    }

    mensaje("info", feriadoEnEdicion ? "Feriado actualizado." : "Feriado creado.")
    const anioGuardado = cuerpo.fecha.slice(0, 4)
    salirDeEdicion()
    document.getElementById("panelSoporte").removeAttribute("open")
    campoAnio.value = anioGuardado
    cargarFeriados()
})

document.getElementById("tablaFeriados").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar]")?.dataset.editar
    if (editar) {
        feriadoEnEdicion = feriados.find((f) => String(f.id) === editar)
        document.getElementById("fecha").value = feriadoEnEdicion.fecha
        document.getElementById("nombre").value = feriadoEnEdicion.nombre
        document.getElementById("alcance").value = feriadoEnEdicion.alcance
        mostrarCamposAlcance()
        document.getElementById("region").value = feriadoEnEdicion.region ? String(feriadoEnEdicion.region) : ""
        document.getElementById("comuna").value = feriadoEnEdicion.comuna ? `${COMUNAS[feriadoEnEdicion.comuna] ?? ""} (${feriadoEnEdicion.comuna})` : ""
        document.getElementById("irrenunciable").checked = feriadoEnEdicion.irrenunciable
        document.getElementById("tituloPanel").textContent = `Editar: ${feriadoEnEdicion.nombre}`
        document.getElementById("botonGuardar").textContent = "Guardar cambios"
        document.getElementById("cancelarEdicion").hidden = false
        const panel = document.getElementById("panelSoporte")
        panel.open = true
        panel.scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }

    const eliminar = evento.target.closest("[data-eliminar]")?.dataset.eliminar
    if (eliminar) {
        const f = feriados.find((x) => String(x.id) === eliminar)
        if (!confirm(`¿Eliminar el feriado "${f.nombre}" del ${fechaCorta(f.fecha)} (${lugar(f)})?`)) {
            return
        }
        limpiarMensajes()
        const resultado = await llamarApi(`/api/feriados/${eliminar}`, { method: "DELETE" })
        if (resultado.status !== 204 && resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo eliminar el feriado")
            return
        }
        mensaje("info", "Feriado eliminado.")
        cargarFeriados()
    }
})

document.addEventListener("usuario-listo", function (evento) {
    esSoporte = evento.detail.rol_plataforma === "soporte"
    document.getElementById("panelSoporte").hidden = !esSoporte
    campoAnio.value = new URLSearchParams(location.search).get("anio") ?? new Date().getFullYear()
    mostrarCamposAlcance()
    cargarFeriados()
})
