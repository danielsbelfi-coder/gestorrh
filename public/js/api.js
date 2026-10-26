async function llamarApi(ruta, opciones = {}) {
    const token = localStorage.getItem("token")

    const headers = {
        "Content-Type": "application/json"
    }

    if (token) {
        headers["Authorization"] = "Bearer " + token
    }

    const respuesta = await fetch(ruta, {
        ...opciones,
        headers: headers
    })

    const datos = await respuesta.json()

    return { status: respuesta.status, datos }
}

function requiereLogin() {
    const token = localStorage.getItem("token")
    if (!token) {
        window.location.href = "login.html"
    }
}

function escaparHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;")
}

async function descargarArchivo(ruta) {
    const token = localStorage.getItem("token")

    const respuesta = await fetch(ruta, {
        headers: { "Authorization": "Bearer " + token }
    })

    if (!respuesta.ok) {
        const datos = await respuesta.json()
        return { status: respuesta.status, datos }
    }

    const disposicion = respuesta.headers.get("Content-Disposition") ?? ""
    const coincidencia = disposicion.match(/filename="(.+)"/)
    const nombre = coincidencia ? coincidencia[1] : "descarga"

    const blob = await respuesta.blob()
    const url = URL.createObjectURL(blob)

    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = nombre
    enlace.click()

    setTimeout(() => URL.revokeObjectURL(url), 1000)

    return { status: respuesta.status }
}

function formatearFecha(texto) {
    const [anio, mes, dia] = texto.split("-")
    return `${dia}-${mes}-${anio}`
}

function mostrarProblemas(idLista, problemas) {
    document.getElementById(idLista).innerHTML = problemas.map(function (problema) {
        const motivos = problema.motivos ?? [problema.motivo]
        return `<li>Trabajador ${problema.trabajador_id}: ${escaparHtml(motivos.join("; "))}</li>`
    }).join("")
}