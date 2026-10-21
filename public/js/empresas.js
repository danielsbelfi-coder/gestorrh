requiereLogin()

let esAdminCuenta = false

async function cargarEmpresas() {
    const ruta = esAdminCuenta ? "/api/cuenta/empresas" : "/api/empresas"
    const resultado = await llamarApi(ruta)

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const lista = document.getElementById("listaEmpresas")
    lista.innerHTML = resultado.datos.map(function (empresa) {
        const estado = empresa.estado === "inactiva"
            ? `inactiva desde ${escaparHtml(empresa.fecha_desactivacion)}`
            : "activa"

        let boton = ""

        if (esAdminCuenta) {
            boton = empresa.estado === "activa"
                ? `<button data-accion="desactivar" data-id="${empresa.id}">Desactivar</button>`
                : `<button data-accion="reactivar" data-id="${empresa.id}">Reactivar</button>`
        }
        return `<li>${escaparHtml(empresa.razon_social)} (${escaparHtml(empresa.rut)}-${escaparHtml(empresa.dv)}) - ${estado} ${boton}</li>`

    }).join("")
}

async function iniciar() {
    const resultado = await llamarApi("/api/auth/usuario")
    esAdminCuenta = resultado.status === 200 && resultado.datos.es_admin_cuenta === true
    cargarEmpresas()
}

const formulario = document.getElementById("formCrearEmpresa")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()

    document.getElementById("mensajeError").textContent = ""

    const datos = {
        rut: document.getElementById("rut").value,
        dv: document.getElementById("dv").value,
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

document.getElementById("listaEmpresas").addEventListener("click", async function (evento) {
    const accion = evento.target.dataset.accion
    const id = evento.target.dataset.id

    if (!accion) {
        return
    }

    document.getElementById("mensajeError").textContent = ""
    let resultado

    if (accion === "desactivar") {
        resultado = await llamarApi(`/api/empresas/${id}/desactivar`, { method: "PATCH" })

        if (resultado.status === 400) {
            if (!confirm(resultado.datos.error)) {
                return
            }

            resultado = await llamarApi(`/api/empresas/${id}/desactivar`, {
                method: "PATCH",
                body: JSON.stringify({ confirmar: true })
            })
        }
    } else if (accion === "reactivar") {
        resultado = await llamarApi(`/api/empresas/${id}/reactivar`, { method: "PATCH" })
    }

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    cargarEmpresas()
})

document.addEventListener("DOMContentLoaded", iniciar)