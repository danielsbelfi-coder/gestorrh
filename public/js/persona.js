requiereLogin()

const personaId = new URLSearchParams(location.search).get("id")
const formulario = document.getElementById("formPersona")

const TIPOS_PENSION = { vejez: "Vejez", invalidez_total: "Invalidez total", invalidez_parcial: "Invalidez parcial", sobrevivencia: "Sobrevivencia" }

// Campos que el backend permite editar (CAMPOS_EDITABLES de persona.service.js).
const CAMPOS_TEXTO = ["nombres", "apellido_paterno", "apellido_materno", "direccion", "telefono", "email", "estado_civil",
    "banco", "numero_cuenta", "plan_isapre_codigo"]
const CAMPOS_SELECCION = ["nacionalidad", "sexo_genero", "tipo_cuenta", "sistema_salud"]

let persona = null
let primeraEmpresa = true

function valor(id) {
    return document.getElementById(id).value.trim()
}

function textoONulo(id) {
    return valor(id) === "" ? null : valor(id)
}

function numeroONulo(id) {
    return valor(id) === "" ? null : Number(valor(id))
}

function datosFormulario() {
    const datos = {}
    for (const campo of [...CAMPOS_TEXTO, ...CAMPOS_SELECCION]) {
        datos[campo] = textoONulo(campo)
    }
    datos.fecha_nacimiento = valor("fecha_nacimiento")
    datos.afp_id = numeroONulo("afp_id")
    datos.afiliado_afc = valor("afiliado_afc") === "true"
    const esIsapre = datos.sistema_salud === "Isapre"
    datos.isapre_id = esIsapre ? numeroONulo("isapre_id") : null
    datos.plan_isapre_codigo = esIsapre ? datos.plan_isapre_codigo : null
    datos.plan_isapre_uf = esIsapre ? numeroONulo("plan_isapre_uf") : null
    return datos
}

// Pone un valor en un <select>; si el valor guardado no está entre las opciones, lo agrega
// (así un dato antiguo no se borra al guardar).
function ponerEnSelect(select, valor) {
    const texto = valor === null || valor === undefined ? "" : String(valor)
    if (texto !== "" && ![...select.options].some((opcion) => opcion.value === texto)) {
        select.add(new Option(texto, texto))
    }
    select.value = texto
}

function llenarFormulario(p) {
    for (const campo of [...CAMPOS_TEXTO, ...CAMPOS_SELECCION, "fecha_nacimiento", "rut", "dv"]) {
        const elemento = document.getElementById(campo)
        if (elemento.tagName === "SELECT") {
            ponerEnSelect(elemento, p[campo])
        } else {
            elemento.value = p[campo] ?? ""
        }
    }
    document.getElementById("afp_id").value = p.afp_id ?? ""
    document.getElementById("isapre_id").value = p.isapre_id ?? ""
    document.getElementById("plan_isapre_uf").value = p.plan_isapre_uf ?? ""
    document.getElementById("afiliado_afc").value = String(p.afiliado_afc ?? true)
    mostrarCamposIsapre()
}

function mostrarCamposIsapre() {
    const esIsapre = valor("sistema_salud") === "Isapre"
    document.querySelectorAll(".solo-isapre").forEach((campo) => { campo.hidden = !esIsapre })
}

document.getElementById("sistema_salud").addEventListener("change", mostrarCamposIsapre)

async function cargarCatalogos() {
    const listas = await cargarListas(["/api/afps", "/api/isapres"])
    if (!listas) {
        return
    }
    const [afps, isapres] = listas
    const activas = (lista) => lista.filter((x) => x.estado !== "inactiva").sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    llenarSelect(document.getElementById("afp_id"), activas(afps).map((a) => ({ id: a.id, texto: a.nombre })), "Sin AFP / no informada")
    llenarSelect(document.getElementById("isapre_id"), activas(isapres).map((i) => ({ id: i.id, texto: i.nombre })), "Elige la isapre")
}

// ---------- Modo edición ----------

async function cargarPersona() {
    const resultado = await llamarApi(`/api/personas/${personaId}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar la persona")
        formulario.hidden = true
        return
    }
    persona = resultado.datos
    llenarFormulario(persona)

    document.getElementById("titulo").textContent = nombreCompleto(persona)
    document.getElementById("subtitulo").textContent = `RUT ${formatearRut(persona.rut, persona.dv)} · ID ${persona.id}`
    document.getElementById("rut").readOnly = true
    document.getElementById("dv").readOnly = true
    document.getElementById("botonGuardar").textContent = "Guardar cambios"
    document.title = `GestorRH - ${nombreCompleto(persona)}`

    document.getElementById("seccionRelaciones").hidden = false
    document.getElementById("seccionSituacion").hidden = false
    await Promise.all([cargarRelaciones(), cargarSituaciones()])
}

async function cargarRelaciones() {
    const listas = await cargarListas(["/api/trabajadores"])
    if (!listas) {
        return
    }
    const propias = listas[0].filter((t) => t.persona_id === persona.id)
    const situacion = situacionPersona(propias)
    document.getElementById("situacionActual").innerHTML = insignia("situacionPersona", situacion)

    document.getElementById("relaciones").innerHTML = propias.length === 0
        ? `<p class="texto-suave">No tiene relaciones laborales con la empresa. <a href="trabajadores.html">Crear como postulante</a></p>`
        : `<table>
            <thead><tr><th>ID trabajador</th><th>Ingreso</th><th>Término</th><th>Estado</th></tr></thead>
            <tbody>${propias.map((t) => `
                <tr>
                    <td class="numero">${escaparHtml(t.id)}</td>
                    <td>${escaparHtml(fechaCorta(t.fecha_ingreso))}</td>
                    <td>${escaparHtml(fechaCorta(t.fecha_termino))}</td>
                    <td>${insignia("trabajador", t.estado)}</td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

async function cargarSituaciones() {
    const resultado = await llamarApi(`/api/personas/${personaId}/situaciones-previsionales`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar la situación previsional")
        return
    }
    const situaciones = [...resultado.datos].sort((a, b) => String(b.desde).localeCompare(String(a.desde)))
    document.getElementById("situaciones").innerHTML = situaciones.length === 0
        ? `<p class="texto-suave">Sin registros: se considera no pensionado y cotizando en la AFP (a los 65 años o más el sistema lo trata como pensionado por vejez).</p>`
        : `<table>
            <thead><tr><th>Desde</th><th>Pensionado</th><th>Cotiza AFP</th><th>Tipo de pensión</th><th></th></tr></thead>
            <tbody>${situaciones.map((s) => `
                <tr>
                    <td>${escaparHtml(String(s.desde).slice(0, 7))}</td>
                    <td>${s.pensionado ? "Sí" : "No"}</td>
                    <td>${s.cotiza_afp ? "Sí" : "No"}</td>
                    <td>${escaparHtml(TIPOS_PENSION[s.tipo_pension] ?? "—")}</td>
                    <td><button type="button" class="chico secundario" data-eliminar="${s.id}">Eliminar</button></td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

document.getElementById("sitPensionado").addEventListener("change", function () {
    const tipo = document.getElementById("sitTipo")
    tipo.disabled = this.value !== "true"
    tipo.required = this.value === "true"
    if (tipo.disabled) {
        tipo.value = ""
    }
})

document.getElementById("formSituacion").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const pensionado = valor("sitPensionado") === "true"

    const creada = await crearRegistro(`/api/personas/${personaId}/situaciones-previsionales`, {
        desde: valor("sitDesde"),
        pensionado,
        cotiza_afp: valor("sitCotiza") === "true",
        tipo_pension: pensionado ? valor("sitTipo") : null
    }, "Situación previsional registrada.")

    if (creada) {
        this.reset()
        document.getElementById("sitTipo").disabled = true
        cargarSituaciones()
    }
})

document.getElementById("situaciones").addEventListener("click", async function (evento) {
    const id = evento.target.closest("[data-eliminar]")?.dataset.eliminar
    if (!id || !confirm("¿Eliminar este registro de situación previsional?")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/personas/${personaId}/situaciones-previsionales/${id}`, { method: "DELETE" })
    if (resultado.status !== 200 && resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    mensaje("info", "Registro eliminado.")
    cargarSituaciones()
})

// ---------- Guardar ----------

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const datos = datosFormulario()

    if (persona) {
        const resultado = await llamarApi(`/api/personas/${persona.id}`, { method: "PATCH", body: JSON.stringify(datos) })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudieron guardar los cambios")
            return
        }
        persona = resultado.datos
        document.getElementById("titulo").textContent = nombreCompleto(persona)
        mensaje("info", "Cambios guardados.")
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
    }

    if (exigirEmpresaActual() === null) {
        return
    }

    const creada = await crearRegistro("/api/personas", {
        ...datos,
        empresa_id: empresaActual(),
        rut: valor("rut").replace(/\D/g, ""),
        dv: valor("dv").toUpperCase()
    }, "Persona creada.")

    if (creada) {
        location.href = `persona.html?id=${creada.id}`
    }
})

// ---------- Inicio ----------

document.addEventListener("empresa-lista", async function () {
    if (!primeraEmpresa) {
        // Cambiar de empresa desde una ficha vuelve a la lista de esa empresa.
        if (persona && persona.empresa_id !== empresaActual()) {
            location.href = "personas.html"
        }
        return
    }
    primeraEmpresa = false

    await cargarCatalogos()
    if (personaId) {
        await cargarPersona()
        // Si la persona es de otra empresa, la barra pasa a esa empresa.
        if (persona && persona.empresa_id !== empresaActual()) {
            guardarEmpresaActual(persona.empresa_id)
            const selector = document.getElementById("empresaTrabajo")
            if (selector) {
                selector.value = persona.empresa_id
            }
        }
    } else {
        mostrarCamposIsapre()
    }
})
