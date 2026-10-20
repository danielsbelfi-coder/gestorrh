requiereLogin()

const mensaje = document.getElementById("mensaje")

function textoRoles(vinculos) {
    const activos = vinculos.filter((v) => v.estado === "activo")

    if (activos.length === 0) {
        return "Sin roles"
    }

    return activos
        .map((v) => `${escaparHtml(v.Empresa.razon_social)}: ${escaparHtml(v.Rol.codigo)}`)
        .join("<br>")
}

async function cargarUsuarios() {
    const resultado = await llamarApi("/api/cuenta/usuarios")

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }



    document.getElementById("cuerpoUsuarios").innerHTML = resultado.datos.map(function (usuario) {
        const botonEstado = usuario.estado === "activo"
            ? `<button data-accion="desactivar" data-id="${usuario.id}">Desactivar</button>`
            : `<button data-accion="reactivar" data-id="${usuario.id}">Reactivar</button>`

        const botonAdmin = usuario.es_admin_cuenta
            ? `<button data-accion="quitar-admin" data-id="${usuario.id}">Quitar admin</button>`
            : `<button data-accion="dar-admin" data-id="${usuario.id}">Dar admin</button>`

        const botonRestablecer = `<button data-accion="restablecer" data-id="${usuario.id}">Restablecer contraseña</button>`

        return `<tr>
            <td>${escaparHtml(usuario.nombre)}</td>
            <td>${escaparHtml(usuario.email)}</td>
            <td>${escaparHtml(usuario.estado)}</td>
            <td>${usuario.es_admin_cuenta ? "Sí" : "No"}</td>
            <td>${textoRoles(usuario.UsuarioEmpresaRols)}</td>
            <td>${botonEstado} ${botonRestablecer} ${botonAdmin}</td>
        </tr>`
    }).join("")

    const selectUsuario = document.getElementById("rolUsuario")
    const seleccionado = selectUsuario.value

    selectUsuario.innerHTML = resultado.datos.map((usuario) =>
        `<option value="${usuario.id}">${escaparHtml(usuario.nombre)} (${escaparHtml(usuario.email)})</option>`
    ).join("")

    if (seleccionado) {
        selectUsuario.value = seleccionado
    }
}

async function cargarEmpresas() {
    const resultado = await llamarApi("/api/empresas")

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    document.getElementById("rolEmpresa").innerHTML = resultado.datos.map((empresa) =>
        `<option value="${empresa.id}">${escaparHtml(empresa.razon_social)} (${escaparHtml(empresa.rut)}-${escaparHtml(empresa.dv)})</option>`
    ).join("")
}

function mostrarPasswordInicial(datos) {
    mensaje.textContent = `Contraseña inicial de ${datos.usuario.email}: ${datos.passwordInicial}. Entrégala a la persona: no se volverá a mostrar y deberá cambiarla al entrar.`
}

const formulario = document.getElementById("formCrearUsuario")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    mensaje.textContent = ""

    const datos = {
        nombre: document.getElementById("nombre").value,
        email: document.getElementById("email").value
    }

    const resultado = await llamarApi("/api/cuenta/usuarios", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        mensaje.textContent = resultado.datos.error
        return
    }

    mostrarPasswordInicial(resultado.datos)
    formulario.reset()
    cargarUsuarios()
})

document.getElementById("cuerpoUsuarios").addEventListener("click", async function (evento) {
    const accion = evento.target.dataset.accion
    const id = evento.target.dataset.id

    if (!accion) {
        return
    }

    if (accion === "desactivar" && !confirm("¿Desactivar este usuario? Perderá el acceso de inmediato.")) {
        return
    }

    if (accion === "restablecer" && !confirm("¿Restablecer la contraseña de este usuario?")) {
        return
    }

    mensaje.textContent = ""
    let resultado

    if (accion === "desactivar") {
        resultado = await llamarApi(`/api/cuenta/usuarios/${id}/desactivar`, { method: "PATCH" })
    } else if (accion === "reactivar") {
        resultado = await llamarApi(`/api/cuenta/usuarios/${id}/reactivar`, { method: "PATCH" })
    } else if (accion === "restablecer") {
        resultado = await llamarApi(`/api/cuenta/usuarios/${id}/restablecer-password`, { method: "PATCH" })
    } else if (accion === "dar-admin") {
        resultado = await llamarApi(`/api/cuenta/usuarios/${id}/admin-cuenta`, { method: "PATCH", body: JSON.stringify({ es_admin_cuenta: true }) })
    } else if (accion === "quitar-admin") {
        resultado = await llamarApi(`/api/cuenta/usuarios/${id}/admin-cuenta`, { method: "PATCH", body: JSON.stringify({ es_admin_cuenta: false }) })
    }

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    if (accion === "restablecer") {
        mostrarPasswordInicial(resultado.datos)
    }

    cargarUsuarios()
})

document.getElementById("formRol").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    mensaje.textContent = ""

    const usuarioId = document.getElementById("rolUsuario").value
    const empresaId = document.getElementById("rolEmpresa").value
    const rol = document.getElementById("rolCodigo").value

    const resultado = await llamarApi(`/api/cuenta/usuarios/${usuarioId}/empresas/${empresaId}/rol`, {
        method: "PUT",
        body: JSON.stringify({ rol })
    })

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    mensaje.textContent = "Rol asignado"
    cargarUsuarios()
})

document.getElementById("botonQuitarRol").addEventListener("click", async function () {
    mensaje.textContent = ""

    const usuarioId = document.getElementById("rolUsuario").value
    const empresaId = document.getElementById("rolEmpresa").value

    const resultado = await llamarApi(`/api/cuenta/usuarios/${usuarioId}/empresas/${empresaId}/quitar`, {
        method: "PATCH"
    })

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    mensaje.textContent = "Rol quitado"
    cargarUsuarios()
})

document.addEventListener("DOMContentLoaded", cargarUsuarios)
document.addEventListener("DOMContentLoaded", cargarEmpresas)