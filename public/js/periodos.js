requiereLogin()

async function cargarPeriodos() {
    const resultado = await llamarApi("/api/periodos-remuneracion")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const lista = document.getElementById("listaPeriodos")
    lista.innerHTML = deEmpresaActual(resultado.datos).map(function (periodo) {
        return `<li>${periodo.mes} (${periodo.anio}) - (${periodo.estado}) ${periodo.estado === "abierto" ? `<button data-id="${periodo.id}">Cerrar</button>` : ""}</li>`
    }).join("")
}

const formulario = document.getElementById("formCrearPeriodos")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    if (exigirEmpresaActual() === null) {
        return
    }

    const datos = {
        empresa_id: empresaActual(),
        mes: document.getElementById("mes").value,
        anio: document.getElementById("anio").value,
        fecha_apertura: document.getElementById("fechaApertura").value
    }

    const resultado = await llamarApi("/api/periodos-remuneracion", {
        method: "POST",
        body: JSON.stringify(datos)
    })


    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarPeriodos()
})

const lista = document.getElementById("listaPeriodos")

lista.addEventListener("click", async function (evento) {
    const id = evento.target.dataset.id

    if (!id) {
        return
    }

    if (!confirm("¿Cerrar este período? Esta acción no se puede deshacer.")) {
        return
    }

    document.getElementById("mensajeError").textContent = ""
    mostrarProblemas("listaProblemas", [])

    const resultado = await llamarApi("/api/periodos-remuneracion/" + id + "/cerrar", {
        method: "PATCH"
    })

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        if (resultado.datos.problemas) {
            mostrarProblemas("listaProblemas", resultado.datos.problemas)
        }
        return
    }

    cargarPeriodos()

})

document.addEventListener("empresa-lista", cargarPeriodos)