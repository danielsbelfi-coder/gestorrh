// Estructura común de las pantallas internas: menú lateral, barra superior y sesión.
// Cada pantalla solo necesita <main class="contenido" data-titulo="..."> y cargar este archivo después de api.js.

const ICONOS = {
    inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"/>',
    personas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21.5 19"/>',
    trabajadores: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    contratos: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    cargos: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    periodos: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    asistencias: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    licencias: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z"/><path d="M12 10v4M10 12h4"/>',
    resumenes: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z"/><path d="M8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 13l2 2 4-4"/>',
    variables: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    conceptos: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="10" cy="18" r="1.5"/>',
    parametros: '<path d="M5 20V10M12 20V4M19 20v-7"/><circle cx="5" cy="8" r="2"/><circle cx="12" cy="2.5" r="0.5"/><circle cx="19" cy="11" r="2"/>',
    feriados: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13l1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1L9 15.3l2-.3 1-2Z"/>',
    jornadas: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    libro: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4Z"/><path d="M4 17a3 3 0 0 1 3-3h11M8 8h6"/>',
    finiquitos: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 15l2 2 4-4"/>',
    legales: '<path d="M12 3v18M5 7h14M7 7l-3 7a3 3 0 0 0 6 0L7 7ZM17 7l-3 7a3 3 0 0 0 6 0l-3-7ZM8 21h8"/>',
    liquidaciones: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
    empresas: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18"/>',
    usuarios: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    consumo: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    cuentas: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 14h4"/>',
    clave: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    salir: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>'
}

function icono(nombre) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[nombre]}</svg>`
}

function gruposDelMenu(usuario) {
    if (usuario.rol_plataforma === "comercial") {
        return [{ titulo: "Comercial", enlaces: [["cuentas.html", "Cuentas", "cuentas"]] }]
    }

    if (usuario.cuenta_estado === "cancelada") {
        return [{ titulo: "Cuenta", enlaces: [["empresas.html", "Exportar datos", "empresas"]] }]
    }

    const administracion = [["empresas.html", "Empresas", "empresas"]]
    if (usuario.es_admin_cuenta === true) {
        administracion.push(["usuarios.html", "Usuarios", "usuarios"], ["consumo.html", "Consumo del plan", "consumo"])
    }

    return [
        { titulo: "", enlaces: [["index.html", "Inicio", "inicio"]] },
        {
            titulo: "Personas",
            enlaces: [
                ["personas.html", "Personas", "personas"],
                ["trabajadores.html", "Trabajadores", "trabajadores"],
                ["contratos.html", "Contratos", "contratos"],
                ["cargos.html", "Cargos", "cargos"],
                ["jornadas.html", "Jornadas", "jornadas"]
            ]
        },
        {
            titulo: "Remuneraciones",
            enlaces: [
                ["periodos.html", "Periodos", "periodos"],
                ["libro.html", "Libro de asistencia", "libro"],
                ["asistencias.html", "Marcas de asistencia", "asistencias"],
                ["licencias.html", "Licencias médicas", "licencias"],
                ["resumenes.html", "Resumen de asistencia", "resumenes"],
                ["variables.html", "Variables del mes", "variables"],
                ["liquidaciones.html", "Liquidaciones", "liquidaciones"],
                ["finiquitos.html", "Finiquitos", "finiquitos"],
                ["conceptos.html", "Conceptos", "conceptos"]
            ]
        },
        { titulo: "Legales", enlaces: [["legales.html", "Previred y LRE", "legales"], ["parametros.html", "Parámetros legales", "parametros"], ["feriados.html", "Feriados", "feriados"]] },
        { titulo: "Administración", enlaces: administracion }
    ]
}

function iniciales(nombre) {
    return String(nombre ?? "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase() ?? "")
        .join("")
}

function armarLateral(usuario) {
    // Una pantalla de detalle (por ejemplo persona.html) puede marcar en el menú a su lista con data-menu.
    const paginaActual = document.querySelector("main.contenido")?.dataset.menu
        || location.pathname.split("/").pop() || "index.html"

    const grupos = gruposDelMenu(usuario).map((grupo) => {
        const enlaces = grupo.enlaces.map(([href, texto, nombreIcono]) => {
            const activo = href === paginaActual ? " activo" : ""
            return `<a class="lateral-enlace${activo}" href="${href}">${icono(nombreIcono)}<span>${escaparHtml(texto)}</span></a>`
        }).join("")
        const titulo = grupo.titulo ? `<div class="lateral-titulo">${escaparHtml(grupo.titulo)}</div>` : ""
        return `<div class="lateral-grupo">${titulo}${enlaces}</div>`
    }).join("")

    return `
        <a class="lateral-marca" href="index.html"><span class="marca-logo">RH</span><span>GestorRH</span></a>
        <nav class="lateral-nav">${grupos}</nav>
        <div class="lateral-pie">
            <div class="lateral-usuario">
                <span class="avatar">${escaparHtml(iniciales(usuario.nombre))}</span>
                <div class="lateral-usuario-datos">
                    <div class="lateral-usuario-nombre">${escaparHtml(usuario.nombre ?? "")}</div>
                    <div class="lateral-usuario-email">${escaparHtml(usuario.email ?? "")}</div>
                </div>
            </div>
            <a class="lateral-enlace" href="cambiar-password.html">${icono("clave")}<span>Cambiar contraseña</span></a>
            <button type="button" class="lateral-enlace lateral-boton" id="botonSalir">${icono("salir")}<span>Cerrar sesión</span></button>
        </div>`
}

async function iniciarLayout() {
    if (!localStorage.getItem("token")) {
        window.location.href = "login.html"
        return
    }

    const contenido = document.querySelector("main.contenido")
    if (!contenido) {
        return
    }

    const resultado = await llamarApi("/api/auth/usuario")
    const usuario = resultado.status === 200 ? resultado.datos : {}

    document.body.classList.add("app")

    const lateral = document.createElement("aside")
    lateral.className = "lateral"
    lateral.innerHTML = armarLateral(usuario)

    const velo = document.createElement("div")
    velo.className = "velo"

    const principal = document.createElement("div")
    principal.className = "principal"

    const barra = document.createElement("header")
    barra.className = "barra-superior"
    barra.innerHTML = `
        <button type="button" class="boton-menu" id="botonMenu" aria-label="Abrir menú">${icono("menu")}</button>
        <div class="barra-titulo"></div>
        <div class="barra-espacio"></div>`
    barra.querySelector(".barra-titulo").textContent = contenido.dataset.titulo ?? ""

    contenido.parentNode.insertBefore(principal, contenido)
    principal.appendChild(barra)
    principal.appendChild(contenido)
    document.body.prepend(velo)
    document.body.prepend(lateral)

    document.getElementById("botonSalir").addEventListener("click", sesionVencida)
    document.getElementById("botonMenu").addEventListener("click", () => document.body.classList.toggle("menu-abierto"))
    velo.addEventListener("click", () => document.body.classList.remove("menu-abierto"))

    document.dispatchEvent(new CustomEvent("usuario-listo", { detail: usuario }))

    if (contenido.hasAttribute("data-empresa")) {
        await iniciarSelectorEmpresa(barra)
    }
}

// Selector de empresa de trabajo. Solo aparece en las pantallas marcadas con data-empresa.
// Al elegir una empresa se avisa con el evento "empresa-lista" y cada pantalla recarga sus datos.
async function iniciarSelectorEmpresa(barra) {
    const resultado = await llamarApi("/api/empresas")
    const empresas = resultado.status === 200 ? resultado.datos : []

    empresas.sort((a, b) => (a.estado === "inactiva") - (b.estado === "inactiva")
        || nombreEmpresa(a).localeCompare(nombreEmpresa(b), "es"))

    const contenedor = document.createElement("label")
    contenedor.className = "selector-empresa"

    if (empresas.length === 0) {
        contenedor.textContent = "Sin empresas"
        barra.appendChild(contenedor)
        document.dispatchEvent(new CustomEvent("empresa-lista", { detail: null }))
        return
    }

    if (!empresas.some((empresa) => empresa.id === empresaActual())) {
        guardarEmpresaActual(empresas[0].id)
    }

    contenedor.innerHTML = `<span>Empresa</span><select id="empresaTrabajo">${empresas.map((empresa) => {
        const inactiva = empresa.estado === "inactiva" ? " (inactiva)" : ""
        const elegida = empresa.id === empresaActual() ? " selected" : ""
        return `<option value="${empresa.id}"${elegida}>${escaparHtml(nombreEmpresa(empresa) + inactiva)}</option>`
    }).join("")}</select>`
    barra.appendChild(contenedor)

    const avisar = () => document.dispatchEvent(new CustomEvent("empresa-lista", {
        detail: empresas.find((empresa) => empresa.id === empresaActual())
    }))

    contenedor.querySelector("select").addEventListener("change", function (evento) {
        guardarEmpresaActual(evento.target.value)
        avisar()
    })

    avisar()
}

function nombreEmpresa(empresa) {
    return empresa.nombre_fantasia || empresa.razon_social || `Empresa ${empresa.id}`
}

iniciarLayout()
