requiereLogin()

async function cargarTrabajadores() {
    const resultado = await llamarApi("/api/trabajadores")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error   
        return
    }

    const lista = document.getElementById("listaTrabajadores")
    lista.innerHTML = deEmpresaActual(resultado.datos).map(function(trabajador) {
        return `<li>${trabajador.persona_id} (${trabajador.empresa_id}) - ${trabajador.estado} </li>`
    }).join("")
}

const formulario = document.getElementById("formCrearTrabajador")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    if (exigirEmpresaActual() === null) {
        return
    }

    const datos = {
        persona_id: document.getElementById("personaId").value,
        empresa_id: empresaActual(),
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

document.addEventListener("empresa-lista", cargarTrabajadores)