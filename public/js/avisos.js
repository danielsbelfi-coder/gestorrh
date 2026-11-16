// Avisos flotantes. Las pantallas siguen escribiendo en #mensajeInfo, #mensaje (éxito) y #mensajeError (error);
// este archivo los muestra como un aviso fijo arriba a la derecha, visible sin hacer scroll:
// - los de éxito se cierran solos a los 6 segundos (se pausan si se les pasa el mouse);
// - los de error quedan hasta cerrarlos con la X (o hasta que la pantalla limpie el mensaje en un nuevo intento).
// Las pantallas de acceso (login, 2FA, cambio de contraseña) conservan el mensaje dentro de la tarjeta.

const SEGUNDOS_EXITO = 6
const IDS_AVISO = { mensajeInfo: "exito", mensaje: "exito", mensajeError: "error" }

function contenedorDeAvisos() {
    let contenedor = document.getElementById("avisos")
    if (!contenedor) {
        contenedor = document.createElement("div")
        contenedor.id = "avisos"
        contenedor.className = "avisos"
        document.body.appendChild(contenedor)
    }
    return contenedor
}

function cerrarAviso(aviso) {
    if (!aviso || aviso.dataset.cerrando === "1") {
        return
    }
    aviso.dataset.cerrando = "1"
    clearTimeout(Number(aviso.dataset.temporizador))
    aviso.classList.add("saliendo")
    setTimeout(() => aviso.remove(), 200)
}

function programarCierre(aviso) {
    clearTimeout(Number(aviso.dataset.temporizador))
    aviso.dataset.temporizador = String(setTimeout(() => cerrarAviso(aviso), SEGUNDOS_EXITO * 1000))
}

// Crea (o reemplaza) el aviso de un origen. contenido: texto o nodos ya presentes en la página.
// origen identifica de dónde viene (para que un mensaje nuevo reemplace al anterior y no se apilen).
function mostrarAviso(contenido, tipo = "exito", origen = null) {
    const contenedor = contenedorDeAvisos()

    if (origen) {
        cerrarAvisosDeOrigen(origen, true)
    }

    const aviso = document.createElement("div")
    aviso.className = `aviso ${tipo}`
    aviso.setAttribute("role", tipo === "error" ? "alert" : "status")
    if (origen) {
        aviso.dataset.origen = origen
    }

    const cuerpo = document.createElement("div")
    cuerpo.className = "aviso-texto"
    if (typeof contenido === "string") {
        cuerpo.textContent = contenido
    } else {
        cuerpo.append(...contenido)
    }
    aviso.appendChild(cuerpo)

    const cerrar = document.createElement("button")
    cerrar.type = "button"
    cerrar.className = "aviso-cerrar"
    cerrar.setAttribute("aria-label", "Cerrar aviso")
    cerrar.textContent = "×"
    cerrar.addEventListener("click", () => cerrarAviso(aviso))
    aviso.appendChild(cerrar)

    contenedor.appendChild(aviso)

    if (tipo !== "error") {
        programarCierre(aviso)
        aviso.addEventListener("mouseenter", () => clearTimeout(Number(aviso.dataset.temporizador)))
        aviso.addEventListener("mouseleave", () => programarCierre(aviso))
    }

    return aviso
}

function cerrarAvisosDeOrigen(origen, sinAnimacion = false) {
    for (const aviso of document.querySelectorAll(`#avisos .aviso[data-origen="${origen}"]`)) {
        if (sinAnimacion) {
            clearTimeout(Number(aviso.dataset.temporizador))
            aviso.remove()
        } else {
            cerrarAviso(aviso)
        }
    }
}

function avisoDeElemento(elemento) {
    const tipo = IDS_AVISO[elemento.id]
    const hayTexto = elemento.textContent.trim() !== ""

    elemento.classList.toggle("en-aviso", hayTexto)

    if (!hayTexto) {
        // La pantalla limpió el mensaje (nuevo intento): el error anterior ya no corresponde.
        if (tipo === "error") {
            cerrarAvisosDeOrigen(elemento.id)
        }
        return
    }

    mostrarAviso([...elemento.cloneNode(true).childNodes], tipo, elemento.id)
}

function vigilarMensajes() {
    for (const id of Object.keys(IDS_AVISO)) {
        const elemento = document.getElementById(id)
        if (!elemento || elemento.closest(".acceso-tarjeta")) {
            continue
        }

        new MutationObserver(() => avisoDeElemento(elemento))
            .observe(elemento, { childList: true, characterData: true, subtree: true })

        if (elemento.textContent.trim() !== "") {
            avisoDeElemento(elemento)
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", vigilarMensajes)
} else {
    vigilarMensajes()
}
