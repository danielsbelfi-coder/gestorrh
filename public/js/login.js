// Ingreso de usuarios. Más adelante podrán existir otros tipos de acceso (postulantes, trabajadores);
// cada uno tendrá su propia ruta de login y su propio destino, sin tocar este flujo.

const ACCESOS = {
    usuario: {
        ruta: "/api/auth/login",
        destino(datos) {
            if (datos.debeCambiarPassword === true) {
                return "cambiar-password.html"
            }
            if (datos.cuentaCancelada === true) {
                return "empresas.html"
            }
            return "index.html"
        }
    }
}

const formulario = document.getElementById("formLogin")
const boton = document.getElementById("botonEntrar")
const mensajeError = document.getElementById("mensajeError")

requiereLogin()

// Si ya hay una sesión abierta, no tiene sentido volver a ingresar. Se usa fetch directo (no llamarApi)
// porque un 401 aquí es lo normal y no debe redirigir otra vez al login.
fetch("/api/auth/usuario").then((respuesta) => {
    if (respuesta.ok) {
        window.location.href = "index.html"
    }
}).catch(() => { /* sin conexión: se queda en el login */ })

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    mensajeError.textContent = ""

    const acceso = ACCESOS[formulario.dataset.tipo]
    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value

    boton.disabled = true
    boton.textContent = "Ingresando…"

    try {
        const resultado = await llamarApi(acceso.ruta, {
            method: "POST",
            body: JSON.stringify({ email, password })
        })

        if (resultado.status === 200) {
            guardarCsrf(resultado.datos.csrfToken)
            window.location.href = acceso.destino(resultado.datos)
            return
        }

        mensajeError.textContent = resultado.datos?.error ?? "No se pudo iniciar sesión"
    } catch {
        mensajeError.textContent = "No se pudo conectar con el servidor. Intenta de nuevo."
    }

    boton.disabled = false
    boton.textContent = "Entrar"
})
