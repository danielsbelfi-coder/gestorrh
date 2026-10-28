requiereLogin()

let esAdminCuenta = false
let cuentaCancelada = false

ESTADOS.empresa = { activa: ["Activa", "exito"], inactiva: ["Inactiva", "advertencia"] }

const tabla = crearTabla({
    contenedor: "tablaEmpresas",
    textoBuscar: "Buscar por razón social o RUT…",
    vacio: "La cuenta todavía no tiene empresas.",
    columnas: [
        { titulo: "ID", valor: (e) => e.id, numero: true },
        {
            titulo: "Razón social", valor: (e) => e.razon_social,
            html: (e) => `<a href="empresa.html?id=${e.id}">${escaparHtml(e.razon_social)}</a>`
        },
        { titulo: "RUT", valor: (e) => formatearRut(e.rut, e.dv) },
        {
            titulo: "Estado", valor: (e) => textoEstado("empresa", e.estado),
            html: (e) => insignia("empresa", e.estado)
                + (e.estado === "inactiva" && e.fecha_desactivacion ? `<div class="nota">desde ${escaparHtml(fechaCorta(e.fecha_desactivacion))}</div>` : "")
                + (e.fecha_eliminacion ? `<div class="nota peligro">sus datos se eliminan el ${escaparHtml(fechaCorta(e.fecha_eliminacion))} si no se reactiva</div>` : "")
        },
        { titulo: "", orden: false, valor: () => "", html: botones }
    ],
    filtros: [{ titulo: "Estado", valor: (e) => e.estado, opciones: opcionesDe("empresa") }]
})

function botones(empresa) {
    const lista = [`<a class="boton secundario chico" href="empresa.html?id=${empresa.id}">Ver y editar</a>`]
    if (esAdminCuenta) {
        if (!cuentaCancelada) {
            lista.push(empresa.estado === "activa"
                ? `<button type="button" class="chico secundario" data-accion="desactivar" data-id="${empresa.id}">Desactivar</button>`
                : `<button type="button" class="chico" data-accion="reactivar" data-id="${empresa.id}">Reactivar</button>`)
        }
        lista.push(`<button type="button" class="chico secundario" data-accion="exportar" data-id="${empresa.id}">Exportar datos</button>`)
    }
    return lista.join(" ")
}

async function cargarEmpresas() {
    const listas = await cargarListas([esAdminCuenta ? "/api/cuenta/empresas" : "/api/empresas"])
    if (!listas) {
        return
    }
    tabla.mostrar([...listas[0]].sort((a, b) =>
        (a.estado === "inactiva") - (b.estado === "inactiva") || a.razon_social.localeCompare(b.razon_social, "es")))
}

document.getElementById("formCrearEmpresa").addEventListener("submit", async function (evento) {
    evento.preventDefault()

    const creada = await crearRegistro("/api/empresas", {
        rut: document.getElementById("rut").value.replace(/\D/g, ""),
        dv: document.getElementById("dv").value.trim().toUpperCase(),
        razon_social: document.getElementById("razonSocial").value.trim(),
        representante_legal_nombre: document.getElementById("representanteLegalNombre").value.trim(),
        representante_legal_rut: document.getElementById("representanteLegalRut").value.trim(),
        direccion: document.getElementById("direccion").value.trim()
    }, "Empresa creada.")

    if (creada) {
        // Se abre su ficha para completar el resto de los datos.
        location.href = `empresa.html?id=${creada.id}`
    }
})

document.getElementById("tablaEmpresas").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const { accion, id } = boton.dataset
    limpiarMensajes()

    if (accion === "exportar") {
        const resultado = await descargarArchivo(`/api/cuenta/empresas/${id}/exportar`)
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo exportar")
        }
        return
    }

    let resultado
    if (accion === "desactivar") {
        resultado = await llamarApi(`/api/empresas/${id}/desactivar`, { method: "PATCH" })
        // El backend responde 400 con el aviso de los 90 días; se confirma y se reintenta.
        if (resultado.status === 400) {
            if (!confirm(resultado.datos.error)) {
                return
            }
            resultado = await llamarApi(`/api/empresas/${id}/desactivar`, { method: "PATCH", body: JSON.stringify({ confirmar: true }) })
        }
    } else if (accion === "reactivar") {
        resultado = await llamarApi(`/api/empresas/${id}/reactivar`, { method: "PATCH" })
    }

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    mensaje("info", accion === "desactivar" ? "Empresa desactivada." : "Empresa reactivada.")
    cargarEmpresas()
})

document.addEventListener("usuario-listo", function (evento) {
    const usuario = evento.detail
    esAdminCuenta = usuario.es_admin_cuenta === true
    cuentaCancelada = usuario.cuenta_estado === "cancelada"

    document.getElementById("panelCrear").hidden = !esAdminCuenta || cuentaCancelada
    if (cuentaCancelada) {
        mensaje("error", `La cuenta está cancelada. Sus datos se eliminarán el ${fechaCorta(usuario.cuenta_fecha_eliminacion)}. Hasta esa fecha puedes descargarlos con "Exportar datos".`)
    }
    cargarEmpresas()
})
