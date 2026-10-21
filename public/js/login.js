const formulario = document.getElementById("formLogin")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value

    const resultado = await llamarApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    })

    if (resultado.status === 200) {
        localStorage.setItem("token", resultado.datos.token)

        if (resultado.datos.debeCambiarPassword === true) {
            window.location.href = "cambiar-password.html"
        } else {
            window.location.href = "index.html"
        }
    } else {
        document.getElementById("mensajeError").textContent = resultado.datos.error
    }
})