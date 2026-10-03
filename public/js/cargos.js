requiereLogin()

async function cargarCargos() {
    const resultado = await llamarApi("/api/cargos")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const lista = document.getElementById("listaCargos")
    lista.innerHTML = resultado.datos.map(function (cargo) {
        return `<li>${cargo.nombre} (${cargo.empresa_id}) </li>`
    }).join("")
}

const formulario = document.getElementById("formCrearCargo")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    const datos = {
        empresa_id: document.getElementById("empresaId").value,
        nombre: document.getElementById("nombre").value,
        departamento_id: document.getElementById("departamentoId").value,
        descripcion: document.getElementById("descripcion").value
    }

    if (datos.departamento_id === "") {
        datos.departamento_id = null
    }
    if (datos.descripcion === "") {
        datos.descripcion = null
    }

    const resultado = await llamarApi("/api/cargos", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarCargos()
})

document.addEventListener("DOMContentLoaded", cargarCargos)