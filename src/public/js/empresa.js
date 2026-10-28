requiereLogin()

const empresaId = new URLSearchParams(location.search).get("id")
const formulario = document.getElementById("formEmpresa")
const CAMPOS = ["razon_social", "nombre_fantasia", "direccion", "representante_legal_nombre", "representante_legal_rut", "mutualidad_id", "tasa_adicional_mutual"]
const campoComuna = document.getElementById("comuna")
const OPCIONES_COMUNA = Object.entries(COMUNAS).map(([codigo, nombre]) => ({ id: codigo, texto: `${nombre} (${codigo})` }))
llenarBuscador(campoComuna, OPCIONES_COMUNA)

// Mutualidades activas; si la empresa tiene una inactiva asignada, se agrega para no perder el dato al guardar.
async function cargarMutualidades(actual) {
    const resultado = await llamarApi("/api/mutualidades")
    const lista = resultado.status === 200 ? resultado.datos : []
    const visibles = lista.filter((m) => m.estado !== "inactivo" || m.id === actual)
    llenarSelect(document.getElementById("mutualidad_id"),
        visibles.map((m) => ({ id: m.id, texto: m.estado === "inactivo" ? `${m.nombre} (inactiva)` : m.nombre })),
        "Sin mutualidad (ISL)")
}

function mostrarEmpresa(empresa) {
    document.title = `GestorRH - ${empresa.razon_social}`
    document.getElementById("titulo").textContent = empresa.razon_social
    document.getElementById("subtitulo").textContent = `RUT ${formatearRut(empresa.rut, empresa.dv)} · ID ${empresa.id}`
    document.getElementById("estadoActual").innerHTML = empresa.estado === "inactiva"
        ? `<span class="insignia advertencia">Inactiva</span>` : `<span class="insignia exito">Activa</span>`
    for (const campo of CAMPOS) {
        document.getElementById(campo).value = empresa[campo] ?? ""
    }
    campoComuna.value = OPCIONES_COMUNA.find((opcion) => opcion.id === empresa.comuna)?.texto ?? ""
}

async function cargarEmpresa() {
    if (!empresaId) {
        mensaje("error", "Falta la empresa. Vuelve a la lista y elige una.")
        return
    }
    const resultado = await llamarApi(`/api/empresas/${empresaId}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar la empresa")
        return
    }
    await cargarMutualidades(resultado.datos.mutualidad_id)
    mostrarEmpresa(resultado.datos)
    formulario.hidden = false
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const valor = (id) => document.getElementById(id).value.trim()
    const datos = {
        razon_social: valor("razon_social"),
        nombre_fantasia: valor("nombre_fantasia") || null,
        direccion: valor("direccion"),
        representante_legal_nombre: valor("representante_legal_nombre"),
        representante_legal_rut: valor("representante_legal_rut"),
        mutualidad_id: valor("mutualidad_id") === "" ? null : Number(valor("mutualidad_id"))
    }
    // La comuna del empleador es el lugar que aparece en los contratos ("En Curicó, a …").
    const comuna = valorBuscador(campoComuna)
    if (campoComuna.value.trim() !== "" && comuna === null) {
        mensaje("error", "Elige una comuna de la lista de sugerencias")
        return
    }
    datos.comuna = comuna
    if (valor("tasa_adicional_mutual") !== "") {
        datos.tasa_adicional_mutual = Number(valor("tasa_adicional_mutual"))
    }

    const resultado = await llamarApi(`/api/empresas/${empresaId}`, { method: "PATCH", body: JSON.stringify(datos) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron guardar los cambios")
        return
    }
    mostrarEmpresa(resultado.datos)
    mensaje("info", "Cambios guardados.")
    window.scrollTo({ top: 0, behavior: "smooth" })
})

document.addEventListener("usuario-listo", cargarEmpresa)
