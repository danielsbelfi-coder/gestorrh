requiereLogin()

async function cargarTrabajadores() {
    const resultado = await llamarApi("/api/trabajadores")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error   
        return
    }

    const lista = document.getElementById("listaTrabajadores")
    lista.innerHTML = resultado.datos.map(function(trabajador) {
        return `<li>${trabajador.persona_id} (${trabajador.empresa_id}) - ${trabajador.estado} </li>`
    }).join("")
}

const formulario = document.getElementById("formCrearTrabajador")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    const datos = {
        persona_id: document.getElementById("personaId").value,
        empresa_id: document.getElementById("empresaId").value,
        fecha_ingreso: document.getElementById("fechaIngreso").value
    }

    const resultado = await llamarApi("/api/trabajadores", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarTrabajadores()
})

document.addEventListener("DOMContentLoaded", cargarTrabajadores)