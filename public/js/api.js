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
