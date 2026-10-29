// Segundo paso del ingreso: el código de la app (o un código de recuperación).
// La sesión todavía está "pendiente": solo sirve para esta pantalla y vence en 5 minutos.

const formulario = document.getElementById("formCodigo")
const campo = document.getElementById("codigo")
const boton = document.getElementById("botonVerificar")
const mensajeError = document.getElementById("mensajeError")
const mensaje = document.getElementById("mensaje")
const cambiarTipo = document.getElementById("cambiarTipo")
let usarRecuperacion = false

function mostrarTipo() {
    document.getElementById("etiquetaCodigo").textContent = usarRecuperacion ? "Código de recuperación" : "Código de la app"
    document.getElementById("explicacion").textContent = usarRecuperacion
        ? "Escribe uno de los códigos de recuperación que guardaste al activar la verificación (formato xxxxx-xxxxx). Cada uno sirve una sola vez."
        : "Abre la app de autenticación de tu celular y escribe el código de 6 dígitos de GestorRH."
    campo.inputMode = usarRecuperacion ? "text" : "numeric"
    campo.autocomplete = usarRecuperacion ? "off" : "one-time-code"
    cambiarTipo.textContent = usarRecuperacion ? "Usar el código de la app" : "No tengo el celular: usar un código de recuperación"
    campo.value = ""
    campo.focus()
}

cambiarTipo.addEventListener("click", (evento) => {
    evento.preventDefault()
    usarRecuperacion = !usarRecuperacion
    mostrarTipo()
})

document.getElementById("volverLogin").addEventListener("click", (evento) => {
    evento.preventDefault()
    cerrarSesion()
})

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault()
    mensajeError.textContent = ""
    boton.disabled = true

    const resultado = await llamarApi("/api/auth/2fa/verificar", {
        method: "POST",
        body: JSON.stringify({ codigo: campo.value })
    })
    campo.value = ""

    if (resultado.status === 200) {
        guardarCsrf(resultado.datos.csrfToken)
        const destino = destinoTrasIngreso(resultado.datos)
        const restantes = resultado.datos.codigosRestantes

        // Si entró con un código de recuperación o le quedan pocos, se avisa antes de seguir.
        if (resultado.datos.tipoCodigo === "recuperacion" || restantes <= 3) {
            formulario.hidden = true
            cambiarTipo.hidden = true
            mensaje.textContent = `Te quedan ${restantes} código${restantes === 1 ? "" : "s"} de recuperación. `
                + "Genera códigos nuevos en «Mi seguridad»"
                + (resultado.datos.tipoCodigo === "recuperacion" ? " y, si cambiaste de celular, vuelve a inscribir la app." : ".")
            const continuar = document.getElementById("botonContinuar")
            continuar.hidden = false
            continuar.addEventListener("click", () => { window.location.href = destino })
            return
        }
        window.location.href = destino
        return
    }

    if (resultado.status === 429) {
        // Demasiados intentos: el servidor cerró la sesión pendiente.
        formulario.hidden = true
        cambiarTipo.hidden = true
        mensajeError.textContent = resultado.datos.error
        return
    }

    mensajeError.textContent = resultado.datos?.error ?? "No se pudo verificar el código"
    boton.disabled = false
    campo.focus()
})

// Al volver con "Atrás", la página se deja limpia.
window.addEventListener("pageshow", (evento) => {
    if (evento.persisted) {
        formulario.reset()
        mensajeError.textContent = ""
        boton.disabled = false
    }
})

campo.focus()
