requiereLogin()

async function cargarEmpresas() {
    const resultado = await llamarApi("/api/empresas")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error   
        return
    }

    const lista = document.getElementById("listaEmpresas")
    lista.innerHTML = resultado.datos.map(function(empresa) {
        return `<li>${empresa.razon_social} (${empresa.rut}) - ${empresa.estado} </li>`
    }).join("")
}

const formulario = document.getElementById("formCrearEmpresa")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    const datos = {
        rut: document.getElementById("rut").value,
        razon_social: document.getElementById("razonSocial").value,
        representante_legal_nombre: document.getElementById("representanteLegalNombre").value,
        representante_legal_rut: document.getElementById("representanteLegalRut").value,
        direccion: document.getElementById("direccion").value
    }

    const resultado = await llamarApi("/api/empresas", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarEmpresas()
})

document.addEventListener("DOMContentLoaded", cargarEmpresas)