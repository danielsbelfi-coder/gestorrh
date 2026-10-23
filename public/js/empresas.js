requiereLogin()

let esAdminCuenta = false
let cuentaCancelada = false

async function cargarEmpresas() {
    const ruta = esAdminCuenta ? "/api/cuenta/empresas" : "/api/empresas"
    const resultado = await llamarApi(ruta)

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const lista = document.getElementById("listaEmpresas")
    lista.innerHTML = resultado.datos.map(function (empresa) {
        let estado = "activa"

        if (empresa.estado === "inactiva") {
            estado = `Inactiva desde ${escaparHtml(formatearFecha(empresa.fecha_desactivacion))}`
        }

        if (empresa.fecha_eliminacion) {
            estado += `. Sus datos se eliminarán el ${escaparHtml(formatearFecha(empresa.fecha_eliminacion))} si no se reactiva`
        }

        let boton = ""

        if (esAdminCuenta) {
            if (!cuentaCancelada) {
                boton = empresa.estado === "activa"
                    ? `<button data-accion="desactivar" data-id="${empresa.id}">Desactivar</button>`
                    : `<button data-accion="reactivar" data-id="${empresa.id}">Reactivar</button>`
            }

            boton += ` <button data-accion="exportar" data-id="${empresa.id}">Exportar datos</button>`
        }
        return `<li>${escaparHtml(empresa.razon_social)} (${escaparHtml(empresa.rut)}-${escaparHtml(empresa.dv)}) - ${estado} ${boton}</li>`

    }).join("")
}

async function iniciar() {
    const resultado = await llamarApi("/api/auth/usuario")
    esAdminCuenta = resultado.status === 200 && resultado.datos.es_admin_cuenta === true
    cuentaCancelada = resultado.status === 200 && resultado.datos.cuenta_estado === "cancelada"

    if (cuentaCancelada) {
        document.getElementById("seccionCrearEmpresa").hidden = true
        document.getElementById("mensajeError").textContent = `La cuenta está cancelada. Sus datos se eliminarán el ${formatearFecha(resultado.datos.cuenta_fecha_eliminacion)}. Hasta esa fecha puedes descargarlos con "Exportar datos".`
    }

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

    if (accion === "exportar") {
        const resultado = await descargarArchivo(`/api/cuenta/empresas/${id}/exportar`)

        if (resultado.status !== 200) {
            document.getElementById("mensajeError").textContent = resultado.datos.error
        }

        return
    }

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