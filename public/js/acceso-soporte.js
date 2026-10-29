requiereLogin()

ESTADOS.acceso_soporte = { vigente: ["Vigente", "exito"], vencido: ["Vencido", ""], revocado: ["Revocado", "advertencia"] }

const RECURSOS = {
    empresas: ["Empresa", "Listado de empresas"],
    personas: ["Ficha de persona", "Listado de personas"],
    trabajadores: ["Trabajador", "Listado de trabajadores"],
    contratos: ["Contrato", "Listado de contratos"],
    cargos: ["Cargo", "Listado de cargos"],
    asistencias: ["Marca de asistencia", "Marcas de asistencia"],
    "periodos-remuneracion": ["Periodo de remuneración", "Periodos de remuneración"],
    liquidaciones: ["Liquidación", "Listado de liquidaciones"],
    conceptos: ["Concepto de remuneración", "Conceptos de remuneración"],
    variables: ["Variable del mes", "Variables del mes"],
    "resumenes-asistencia": ["Resumen de asistencia", "Resúmenes de asistencia"],
    "licencias-medicas": ["Licencia médica", "Licencias médicas"],
    finiquitos: ["Finiquito", "Listado de finiquitos"],
    jornadas: ["Jornada", "Listado de jornadas"]
}

const VERBOS = { GET: "Consultó", POST: "Intentó crear", PATCH: "Intentó modificar", PUT: "Intentó modificar", DELETE: "Intentó borrar" }

// Convierte "/api/personas/12" en "Ficha de persona #12". Si no se reconoce, deja la ruta tal cual.
function accionLegible(fila) {
    if (fila.tipo === "restablecer_password") {
        return "Restableció la contraseña del administrador principal"
    }
    if (fila.tipo === "restablecer_acceso") {
        return "Restableció el acceso del administrador principal"
    }
    const ruta = String(fila.ruta ?? "").split("?")[0]
    const partes = ruta.replace(/^\/api\//, "").split("/").filter(Boolean)
    const recurso = RECURSOS[partes[0]]
    const verbo = VERBOS[fila.metodo] ?? fila.metodo

    if (!recurso) {
        return `${verbo} ${ruta}`
    }

    const id = /^\d+$/.test(partes[1] ?? "") ? partes[1] : null
    const resto = partes.slice(id ? 2 : 1).join(" / ")
    const objeto = id ? `${recurso[0]} #${id}` : recurso[1]
    return `${verbo}: ${objeto}${resto ? ` (${resto})` : ""}`
}

const esRestablecimiento = (fila) => fila.tipo === "restablecer_password" || fila.tipo === "restablecer_acceso"

function resultadoLegible(fila) {
    if (esRestablecimiento(fila)) {
        return ["Hecho", "advertencia"]
    }
    const estado = fila.estado_http
    if (estado >= 200 && estado < 300) {
        return ["Permitido", "exito"]
    }
    if (estado === 403) {
        return ["Bloqueado (solo lectura)", "advertencia"]
    }
    if (estado === 404) {
        return ["Sin acceso o no existe", "advertencia"]
    }
    return [`Error ${estado ?? ""}`.trim(), ""]
}

function fechaHora(texto) {
    return new Date(texto).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })
}

const tablaAccesos = crearTabla({
    contenedor: "tablaAccesos",
    textoBuscar: "Buscar por empresa o motivo…",
    vacio: "Todavía no has autorizado a soporte.",
    columnas: [
        { titulo: "Empresa", valor: (a) => a.razon_social ?? "(empresa eliminada)" },
        { titulo: "Estado", valor: (a) => textoEstado("acceso_soporte", a.estado), html: (a) => insignia("acceso_soporte", a.estado) },
        { titulo: "Desde", valor: (a) => a.desde, html: (a) => escaparHtml(fechaHora(a.desde)) },
        { titulo: "Hasta", valor: (a) => a.hasta, html: (a) => escaparHtml(fechaHora(a.hasta)) },
        { titulo: "Autorizó", valor: (a) => a.autorizado_por ?? "" },
        { titulo: "Motivo", valor: (a) => a.motivo },
        {
            titulo: "", orden: false, valor: () => "",
            html: (a) => a.estado === "vigente"
                ? `<button type="button" class="chico secundario" data-revocar="${a.id}">Revocar</button>`
                : (a.revocado_por ? `<span class="texto-suave">Revocó ${escaparHtml(a.revocado_por)}</span>` : "")
        }
    ]
})

const tablaRegistro = crearTabla({
    contenedor: "tablaRegistro",
    textoBuscar: "Buscar en lo que consultó soporte…",
    vacio: "Soporte no ha consultado datos de tus empresas.",
    columnas: [
        { titulo: "Fecha", valor: (f) => f.fecha, html: (f) => escaparHtml(fechaHora(f.fecha)) },
        { titulo: "Quién", valor: (f) => f.usuario_soporte },
        { titulo: "Empresa", valor: (f) => f.empresa ?? "" },
        {
            titulo: "Qué hizo", valor: (f) => accionLegible(f),
            html: (f) => esRestablecimiento(f)
                ? `<strong>${escaparHtml(accionLegible(f))}</strong><div class="texto-suave">${escaparHtml(f.detalle ?? "")}</div>`
                : escaparHtml(accionLegible(f))
        },
        { titulo: "Resultado", valor: (f) => resultadoLegible(f)[0], html: (f) => `<span class="insignia ${resultadoLegible(f)[1]}">${escaparHtml(resultadoLegible(f)[0])}</span>` }
    ]
})

async function cargarTodo() {
    const listas = await cargarListas(["/api/cuenta/accesos-soporte", "/api/cuenta/accesos-soporte/registro"])
    if (!listas) {
        return
    }
    tablaAccesos.mostrar(listas[0])
    tablaRegistro.mostrar(listas[1])
}

async function cargarEmpresas() {
    const listas = await cargarListas(["/api/cuenta/empresas"])
    if (!listas) {
        return
    }
    llenarSelect(document.getElementById("empresa"), listas[0].map((e) => ({
        id: e.id,
        texto: `${e.razon_social} (${formatearRut(e.rut, e.dv)})${e.estado === "inactiva" ? " — inactiva" : ""}`
    })))
}

document.getElementById("formAcceso").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const resultado = await llamarApi("/api/cuenta/accesos-soporte", {
        method: "POST",
        body: JSON.stringify({
            empresa_id: Number(document.getElementById("empresa").value),
            horas: Number(document.getElementById("horas").value),
            motivo: document.getElementById("motivo").value.trim()
        })
    })
    if (resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo autorizar el acceso")
        return
    }
    mensaje("info", `Acceso autorizado hasta las ${new Date(resultado.datos.hasta).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}.`)
    document.getElementById("motivo").value = ""
    cargarTodo()
})

document.getElementById("tablaAccesos").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-revocar]")
    if (!boton || !confirm("¿Quitar ahora el acceso de soporte a esta empresa?")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/cuenta/accesos-soporte/${boton.dataset.revocar}/revocar`, { method: "PATCH" })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo revocar el acceso")
    } else {
        mensaje("info", "Acceso revocado: soporte ya no ve esa empresa.")
    }
    cargarTodo()
})

cargarEmpresas()
cargarTodo()
