requiereLogin()


const formulario = document.getElementById("formCambiarPassword")
const mensaje = document.getElementById("mensaje")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    const passwordActual = document.getElementById("passwordActual").value
    const passwordNueva = document.getElementById("passwordNueva").value
    const passwordConfirmacion = document.getElementById("passwordConfirmacion").value

    if (passwordNueva !== passwordConfirmacion) {
        mensaje.textContent = "Las contraseñas nuevas no coinciden"

        return
    }

    const resultado = await llamarApi("/api/auth/cambiar-password", {
        method: "PATCH",
        body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva })
    })

    if (resultado.status === 200) {
        mensaje.textContent = "Contraseña actualizada"
        setTimeout(function () {
            window.location.href = "index.html"
        }, 1500)
    } else {
        mensaje.textContent = resultado.datos.error
    }
})