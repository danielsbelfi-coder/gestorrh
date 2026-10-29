// Inscripción de la app de autenticación. Se llega aquí obligado (soporte, comercial, admins de cuenta)
// o por elección desde «Mi seguridad» (?volver=seguridad).

const volverASeguridad = new URLSearchParams(location.search).get("volver") === "seguridad"
const formulario = document.getElementById("formConfirmar")
const campo = document.getElementById("codigo")
const boton = document.getElementById("botonConfirmar")
const mensajeError = document.getElementById("mensajeError")
const enlaceSalida = document.getElementById("enlaceSalida")
let obligatorio = false

function destinoFinal() {
    return volverASeguridad ? "seguridad.html" : "index.html"
}

async function iniciar() {
    requiereLogin()

    const usuario = await llamarApi("/api/auth/usuario")
    if (usuario.status !== 200) {
        return
    }
    if (usuario.datos.debe_cambiar_password === true) {
        window.location.href = "cambiar-password.html"
        return
    }
    if (usuario.datos.totp_activo === true) {
        window.location.href = destinoFinal()
        return
    }
    obligatorio = usuario.datos.requiere_2fa === true
    document.getElementById("obligatorio").hidden = !obligatorio
    // Quien lo tiene obligatorio no puede seguir sin activarlo: su única salida es cerrar sesión.
    if (!obligatorio) {
        enlaceSalida.textContent = "Volver"
    }

    const resultado = await llamarApi("/api/auth/2fa/inscripcion/iniciar", { method: "POST" })
    if (resultado.status !== 200) {
        mensajeError.textContent = resultado.datos?.error ?? "No se pudo preparar la inscripción"
        return
    }
    document.getElementById("qr").src = resultado.datos.qr
    document.getElementById("secreto").textContent = resultado.datos.secreto
    campo.focus()
}

enlaceSalida.addEventListener("click", (evento) => {
    evento.preventDefault()
    if (obligatorio) {
        cerrarSesion()
    } else {
        window.location.href = destinoFinal()
    }
})

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault()
    mensajeError.textContent = ""
    boton.disabled = true

    const resultado = await llamarApi("/api/auth/2fa/inscripcion/confirmar", {
        method: "POST",
        body: JSON.stringify({ codigo: campo.value })
    })

    if (resultado.status === 200) {
        formulario.reset()
        mostrarCodigosRecuperacion(resultado.datos.codigos, () => { window.location.href = destinoFinal() })
        return
    }

    mensajeError.textContent = resultado.datos?.error ?? "No se pudo activar"
    boton.disabled = false
    campo.select()
})

// Al volver con "Atrás" se recarga: el QR de una inscripción anterior ya no sirve.
window.addEventListener("pageshow", (evento) => {
    if (evento.persisted) {
        location.reload()
    }
})

iniciar()
