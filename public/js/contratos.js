requiereLogin()

async function cargarContratos() {
    const resultado = await llamarApi("/api/contratos")
    
    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error   
        return
    }

    const lista = document.getElementById("listaContratos")
    lista.innerHTML = resultado.datos.map(function(contrato) {
        return `<li>${contrato.trabajador_id} (${contrato.estado}) </li>`
    }).join("")
}

const formulario = document.getElementById("formCrearContratos")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    const datos = {
        trabajador_id: document.getElementById("trabajadorId").value,
        tipo_contrato: document.getElementById("tipoContrato").value,
        fecha_inicio: document.getElementById("fechaInicio").value,
        cargo_id: document.getElementById("cargoId").value,
        funciones: document.getElementById("funciones").value,
        lugar_prestacion_servicios: document.getElementById("lugarPrestacionServicios").value,
        tipo_jornada: document.getElementById("tipoJornada").value,
        horas_semanales: document.getElementById("horasSemanales").value,
        dias_trabajados: document.getElementById("diasTrabajados").value,
        sistema_remuneracion: document.getElementById("sistemaRemuneracion").value,
        sueldo_base: document.getElementById("sueldoBase").value,
        periodicidad_pago: document.getElementById("periodicidadPago").value
    }

    const resultado = await llamarApi("/api/contratos", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    formulario.reset()
    cargarContratos()
})

document.addEventListener("DOMContentLoaded", cargarContratos)