requiereLogin()

const mensajeError = document.getElementById("mensajeError")
const mensajeInfo = document.getElementById("mensajeInfo")
let requiere2fa = false

function fechaHora(texto) {
    return texto ? new Date(texto).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" }) : ""
}

// Resume el user-agent en algo legible ("Chrome en Windows"). Si no se reconoce, se muestra recortado.
function navegadorLegible(agente) {
    const texto = String(agente ?? "")
    const navegador = /Edg\//.test(texto) ? "Edge" : /OPR\//.test(texto) ? "Opera" : /Firefox\//.test(texto) ? "Firefox"
        : /Chrome\//.test(texto) ? "Chrome" : /Safari\//.test(texto) ? "Safari" : null
    const sistema = /Windows/.test(texto) ? "Windows" : /Android/.test(texto) ? "Android" : /iPhone|iPad/.test(texto) ? "iPhone/iPad"
        : /Mac OS X/.test(texto) ? "Mac" : /Linux/.test(texto) ? "Linux" : null
    if (navegador && sistema) {
        return `${navegador} en ${sistema}`
    }
    return texto.slice(0, 40) || "Desconocido"
}

async function cargarDosPasos() {
    const resultado = await llamarApi("/api/auth/2fa")
    if (resultado.status !== 200) {
        mensajeError.textContent = resultado.datos?.error ?? "No se pudo cargar la verificación en dos pasos"
        return
    }
    const estado = resultado.datos
    const texto = document.getElementById("estado2fa")
    const acciones = document.getElementById("acciones2fa")

    if (!estado.activo) {
        texto.textContent = "No está activa. Con ella, además de la contraseña se pide un código de tu celular al ingresar."
        acciones.innerHTML = `<a class="boton" href="activar-2fa.html?volver=seguridad">Activar</a>`
        return
    }

    texto.textContent = `Activa desde el ${fechaHora(estado.activado_en)} · Te quedan ${estado.codigos_restantes} códigos de recuperación sin usar.`
    acciones.innerHTML = `<button type="button" class="boton secundario" data-accion="codigos">Generar códigos de recuperación nuevos</button>
        <button type="button" class="boton secundario" data-accion="desactivar">${requiere2fa ? "Cambiar de celular" : "Desactivar"}</button>`
}

document.getElementById("acciones2fa").addEventListener("click", (evento) => {
    const accion = evento.target.closest("button")?.dataset.accion
    if (accion === "codigos") {
        pedirDatos({
            titulo: "Códigos de recuperación nuevos",
            explicacion: "Los códigos anteriores dejarán de servir. Escribe el código de la app para confirmar.",
            campos: [{ id: "codigo", etiqueta: "Código de la app o de recuperación" }],
            textoBoton: "Generar",
            enviar: async ({ codigo }) => {
                const resultado = await llamarApi("/api/auth/2fa/codigos", { method: "POST", body: JSON.stringify({ codigo }) })
                if (resultado.status !== 200) {
                    return resultado.datos?.error ?? "No se pudieron generar"
                }
                mostrarCodigosRecuperacion(resultado.datos.codigos, cargarDosPasos)
            }
        })
    }
    if (accion === "desactivar") {
        pedirDatos({
            titulo: requiere2fa ? "Cambiar de celular" : "Desactivar la verificación en dos pasos",
            explicacion: requiere2fa
                ? "Se quitará la app actual y deberás inscribir la del celular nuevo de inmediato. Confirma con tu contraseña y un código (de la app o de recuperación)."
                : "Al ingresar solo se pedirá tu contraseña. Confirma con tu contraseña y un código (de la app o de recuperación).",
            campos: [
                { id: "password", etiqueta: "Contraseña", tipo: "password", autocompletar: "current-password" },
                { id: "codigo", etiqueta: "Código de la app o de recuperación" }
            ],
            textoBoton: requiere2fa ? "Continuar" : "Desactivar",
            clase: "peligro",
            enviar: async ({ password, codigo }) => {
                const resultado = await llamarApi("/api/auth/2fa/desactivar", { method: "POST", body: JSON.stringify({ password, codigo }) })
                if (resultado.status !== 200) {
                    return resultado.datos?.error ?? "No se pudo desactivar"
                }
                if (resultado.datos.requiere_2fa) {
                    window.location.href = "activar-2fa.html"
                    return
                }
                mensajeInfo.textContent = "La verificación en dos pasos quedó desactivada."
                cargarDosPasos()
            }
        })
    }
})

async function cargarSesiones() {
    const resultado = await llamarApi("/api/auth/sesiones")
    if (resultado.status !== 200) {
        return
    }
    document.getElementById("tablaSesiones").innerHTML = resultado.datos.map((sesion) => `<tr>
        <td>${escaparHtml(navegadorLegible(sesion.navegador))}${sesion.actual ? ' <span class="insignia exito">Esta sesión</span>' : ""}</td>
        <td>${escaparHtml(sesion.ip ?? "")}</td>
        <td>${escaparHtml(fechaHora(sesion.creada_en))}</td>
        <td>${escaparHtml(fechaHora(sesion.ultimo_uso_en))}</td>
    </tr>`).join("")
    document.getElementById("cerrarOtras").disabled = resultado.datos.length < 2
}

document.getElementById("cerrarOtras").addEventListener("click", async () => {
    const resultado = await llamarApi("/api/auth/sesiones/cerrar-otras", { method: "POST" })
    if (resultado.status === 200) {
        mensajeInfo.textContent = `Se cerraron ${resultado.datos.cerradas} sesión${resultado.datos.cerradas === 1 ? "" : "es"}.`
        cargarSesiones()
    }
})

document.addEventListener("usuario-listo", (evento) => {
    requiere2fa = evento.detail.requiere_2fa === true
    cargarDosPasos()
    cargarSesiones()
})
