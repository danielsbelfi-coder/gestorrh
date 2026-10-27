requiereLogin()

let nombrePorTrabajador = new Map()
const selectorPeriodo = document.getElementById("periodo")

async function cargarNombres() {
    const listas = await cargarListas(["/api/trabajadores", "/api/personas"])
    if (!listas) {
        return
    }
    const personaPorId = porId(listas[1])
    nombrePorTrabajador = new Map(deEmpresaActual(listas[0]).map((t) =>
        [t.id, nombreCompleto(personaPorId.get(t.persona_id)) || `Trabajador ${t.id}`]))
}

// Descarga un archivo legal y muestra los problemas (409) o las advertencias del backend.
async function descargarLegal(ruta, textoExito) {
    limpiarMensajes()
    if (!selectorPeriodo.value) {
        mensaje("error", "Esta empresa no tiene periodos.")
        return
    }

    const resultado = await descargarArchivo(`/api/periodos-remuneracion/${selectorPeriodo.value}/${ruta}`)

    if (resultado.status === 409 && resultado.datos?.problemas) {
        mensaje("error", resultado.datos.error)
        mostrarProblemasConNombre(resultado.datos.problemas.map((p) => ({
            nombre: nombrePorTrabajador.get(p.trabajador_id) ?? `Trabajador ${p.trabajador_id}`,
            motivos: p.motivos ?? [p.motivo]
        })))
        return
    }

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo generar el archivo")
        return
    }

    mensaje("info", [textoExito, ...(resultado.advertencias ?? [])].join(" "))
}

document.getElementById("btnPrevired").addEventListener("click", () => descargarLegal("previred", "Archivo Previred generado."))
document.getElementById("btnLre").addEventListener("click", () => descargarLegal("lre", "Archivo LRE generado."))
selectorPeriodo.addEventListener("change", limpiarMensajes)

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    await cargarNombres()
    await llenarSelectorPeriodos(selectorPeriodo)
})
