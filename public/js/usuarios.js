requiereLogin()

ESTADOS.usuario = { activo: ["Activo", "exito"], inactivo: ["Inactivo", ""] }

function rolesActivos(usuario) {
    return (usuario.UsuarioEmpresaRols ?? []).filter((v) => v.estado === "activo")
}

const tabla = crearTabla({
    contenedor: "tablaUsuarios",
    textoBuscar: "Buscar por nombre, correo, empresa o rol…",
    vacio: "La cuenta todavía no tiene usuarios.",
    columnas: [
        { titulo: "Nombre", valor: (u) => u.nombre },
        { titulo: "Correo", valor: (u) => u.email },
        { titulo: "Estado", valor: (u) => textoEstado("usuario", u.estado), html: (u) => insignia("usuario", u.estado) },
        {
            titulo: "2FA", valor: (u) => (u.totp_activo ? "Activa" : "Sin activar"),
            html: (u) => u.totp_activo
                ? `<span class="insignia exito" title="Verificación en dos pasos activa">Activa</span>`
                : (u.es_admin_cuenta
                    ? `<span class="insignia advertencia" title="Es obligatoria para los administradores: se le pedirá al ingresar">Pendiente</span>`
                    : `<span class="texto-suave" title="Voluntaria para este usuario">No</span>`)
        },
        {
            titulo: "Admin de cuenta", valor: (u) => (u.es_admin_principal ? "Principal" : u.es_admin_cuenta ? "Sí" : "No"),
            html: (u) => u.es_admin_principal
                ? `<span class="insignia info" title="Solo él mismo o soporte pueden cambiar su contraseña, su correo o desactivarlo">Principal</span>`
                : (u.es_admin_cuenta ? "Sí" : "No")
        },
        {
            titulo: "Roles por empresa",
            valor: (u) => rolesActivos(u).map((v) => `${v.Empresa.razon_social} ${v.Rol.codigo}`).join(" "),
            html: (u) => rolesActivos(u).length === 0
                ? `<span class="texto-suave">Sin roles</span>`
                : rolesActivos(u).map((v) => `<div>${escaparHtml(v.Empresa.razon_social)}: <strong>${escaparHtml(v.Rol.codigo)}</strong></div>`).join("")
        },
        {
            titulo: "", orden: false, valor: () => "",
            html: (u) => u.es_admin_principal ? `<span class="texto-suave">Protegido (solo soporte)</span>` : [
                u.estado === "activo"
                    ? `<button type="button" class="chico secundario" data-accion="desactivar" data-id="${u.id}">Desactivar</button>`
                    : `<button type="button" class="chico" data-accion="reactivar" data-id="${u.id}">Reactivar</button>`,
                `<button type="button" class="chico secundario" data-accion="restablecer" data-id="${u.id}" title="Contraseña nueva, verificación en dos pasos desactivada y sesiones cerradas">Restablecer acceso</button>`,
                u.es_admin_cuenta
                    ? `<button type="button" class="chico secundario" data-accion="quitar-admin" data-id="${u.id}">Quitar admin</button>`
                    : `<button type="button" class="chico secundario" data-accion="dar-admin" data-id="${u.id}">Dar admin</button>`
            ].join(" ")
        }
    ],
    filtros: [
        { titulo: "Estado", valor: (u) => u.estado, opciones: opcionesDe("usuario"), inicial: "activo" },
        { titulo: "Admin", valor: (u) => String(u.es_admin_cuenta), opciones: [["true", "Admin de cuenta"], ["false", "No admin"]] }
    ]
})

async function cargarUsuarios() {
    const listas = await cargarListas(["/api/cuenta/usuarios"])
    if (!listas) {
        return
    }
    const usuarios = [...listas[0]].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    tabla.mostrar(usuarios)

    const select = document.getElementById("rolUsuario")
    const elegido = select.value
    llenarSelect(select, usuarios.filter((u) => u.estado === "activo").map((u) => ({ id: u.id, texto: `${u.nombre} (${u.email})` })))
    if (elegido) {
        select.value = elegido
    }
}

async function cargarEmpresas() {
    const listas = await cargarListas(["/api/cuenta/empresas"])
    if (!listas) {
        return
    }
    llenarSelect(document.getElementById("rolEmpresa"), listas[0].map((e) => ({
        id: e.id,
        texto: `${e.razon_social} (${formatearRut(e.rut, e.dv)})${e.estado === "inactiva" ? " — inactiva" : ""}`
    })))
}

function mostrarPasswordInicial(datos) {
    mostrarCredencial({
        titulo: `Contraseña inicial de ${datos.usuario.nombre}`,
        email: datos.usuario.email,
        password: datos.passwordInicial,
        destinatario: `a ${datos.usuario.nombre}`,
        nota: datos.nota
    })
}

document.getElementById("formCrearUsuario").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    const creado = await crearRegistro("/api/cuenta/usuarios", {
        nombre: document.getElementById("nombre").value.trim(),
        email: document.getElementById("email").value.trim()
    }, "")
    if (creado) {
        mostrarPasswordInicial(creado)
        cerrarPanelCrear(this)
        cargarUsuarios()
    }
})

document.getElementById("tablaUsuarios").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const { accion, id } = boton.dataset

    if (accion === "desactivar" && !confirm("¿Desactivar este usuario? Perderá el acceso de inmediato.")) {
        return
    }
    if (accion === "restablecer" && !confirm("¿Restablecer el acceso de este usuario?\n\nSe le asignará una contraseña nueva, se desactivará su verificación en dos pasos y se cerrarán sus sesiones. Úsalo si olvidó la contraseña o perdió el celular.")) {
        return
    }

    limpiarMensajes()
    const rutas = {
        desactivar: [`/api/cuenta/usuarios/${id}/desactivar`],
        reactivar: [`/api/cuenta/usuarios/${id}/reactivar`],
        restablecer: [`/api/cuenta/usuarios/${id}/restablecer-acceso`],
        "dar-admin": [`/api/cuenta/usuarios/${id}/admin-cuenta`, { es_admin_cuenta: true }],
        "quitar-admin": [`/api/cuenta/usuarios/${id}/admin-cuenta`, { es_admin_cuenta: false }]
    }
    const [ruta, cuerpo] = rutas[accion]
    const resultado = await llamarApi(ruta, { method: "PATCH", ...(cuerpo ? { body: JSON.stringify(cuerpo) } : {}) })

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    if (accion === "restablecer") {
        mostrarPasswordInicial({ ...resultado.datos, nota: "Su verificación en dos pasos quedó desactivada y se cerraron sus sesiones: si su perfil la requiere, deberá inscribir de nuevo la app del celular." })
    } else {
        mensaje("info", "Listo.")
    }
    cargarUsuarios()
})

document.getElementById("formRol").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const usuarioId = document.getElementById("rolUsuario").value
    const empresaId = document.getElementById("rolEmpresa").value

    const resultado = await llamarApi(`/api/cuenta/usuarios/${usuarioId}/empresas/${empresaId}/rol`, {
        method: "PUT",
        body: JSON.stringify({ rol: document.getElementById("rolCodigo").value })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo asignar el rol")
        return
    }
    mensaje("info", "Rol asignado.")
    cargarUsuarios()
})

document.getElementById("botonQuitarRol").addEventListener("click", async function () {
    limpiarMensajes()
    const usuarioId = document.getElementById("rolUsuario").value
    const empresaId = document.getElementById("rolEmpresa").value

    const resultado = await llamarApi(`/api/cuenta/usuarios/${usuarioId}/empresas/${empresaId}/quitar`, { method: "PATCH" })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo quitar el rol")
        return
    }
    mensaje("info", "Rol quitado.")
    cargarUsuarios()
})

cargarUsuarios()
cargarEmpresas()
