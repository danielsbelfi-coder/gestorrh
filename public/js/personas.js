requiereLogin()

async function cargarPersonas() {
    const resultado = await llamarApi("/api/personas")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const lista = document.getElementById("listaPersonas")
    lista.innerHTML = resultado.datos.map(function (persona) {
        return `<li>${persona.nombres} (${persona.rut}) </li>`
    }).join("")
}

const formulario = document.getElementById("formCrearPersona")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    const datos = {
        empresa_id: document.getElementById("empresaId").value,
        rut: document.getElementById("rut").value,
        dv: document.getElementById("dv").value,
        nombres: document.getElementById("nombres").value,
        apellido_paterno: document.getElementById("apellidoPaterno").value,
        nacionalidad: document.getElementById("nacionalidad").value,
        fecha_nacimiento: document.getElementById("fechaNacimiento").value,
        direccion: document.getElementById("direccion").value
    }

    const resultado = await llamarApi("/api/personas", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarPersonas()
})

document.addEventListener("DOMContentLoaded", cargarPersonas)