requiereLogin()

const personaId = new URLSearchParams(location.search).get("id")
const formulario = document.getElementById("formPersona")

const TIPOS_PENSION = { vejez: "Vejez", invalidez_total: "Invalidez total", invalidez_parcial: "Invalidez parcial", sobrevivencia: "Sobrevivencia" }

// Campos que el backend permite editar (CAMPOS_EDITABLES de persona.service.js).
const CAMPOS_TEXTO = ["nombres", "apellido_paterno", "apellido_materno", "direccion", "telefono", "email", "estado_civil",
    "banco", "numero_cuenta", "plan_isapre_codigo"]
const CAMPOS_SELECCION = ["nacionalidad", "sexo_genero", "tipo_cuenta", "sistema_salud"]

let persona = null
let afpsApv = []
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
    datos.afiliado_afc = valor("afiliado_afc") === "true"
    const esIsapre = datos.sistema_salud === "Isapre"
    datos.plan_isapre_codigo = esIsapre ? datos.plan_isapre_codigo : null
    // En una persona existente, la AFP y la salud cambian solo con el historial de previsión.
    if (persona) {
        delete datos.sistema_salud
        return datos
    }
    datos.afp_id = numeroONulo("afp_id")
    datos.isapre_id = esIsapre ? numeroONulo("isapre_id") : null
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
    const activas = (lista) => lista.filter((x) => x.estado !== "inactivo").sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    llenarSelect(document.getElementById("afp_id"), activas(afps).map((a) => ({ id: a.id, texto: a.nombre })), "Sin AFP / no informada")
    llenarSelect(document.getElementById("isapre_id"), activas(isapres).map((i) => ({ id: i.id, texto: i.nombre })), "Elige la isapre")
    llenarSelect(document.getElementById("prevAfp"), activas(afps).map((a) => ({ id: a.id, texto: a.nombre })), "Elige la AFP")
    llenarSelect(document.getElementById("prevIsapre"), activas(isapres).map((i) => ({ id: i.id, texto: i.nombre })), "Elige la isapre")

    // Institución del APV: las AFP con su código Previred de 3 dígitos, u otra institución con su código.
    afpsApv = activas(afps).filter((a) => a.codigo_previred).map((a) => ({ codigo: String(a.codigo_previred).padStart(3, "0"), nombre: a.nombre }))
    const institucion = document.getElementById("ahoInstitucion")
    institucion.innerHTML = [
        `<option value="">Elige la institución</option>`,
        ...afpsApv.map((a) => `<option value="${escaparHtml(a.codigo)}">${escaparHtml(a.nombre)} (${escaparHtml(a.codigo)})</option>`),
        `<option value="otra">Otra institución…</option>`
    ].join("")
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

    // La previsión vigente se muestra, pero se cambia en el historial.
    for (const id of ["afp_id", "sistema_salud", "isapre_id", "plan_isapre_uf"]) {
        document.getElementById(id).disabled = true
    }
    document.getElementById("notaPrevision").hidden = false

    document.getElementById("seccionRelaciones").hidden = false
    document.getElementById("seccionSituacion").hidden = false
    document.getElementById("seccionPrevision").hidden = false
    document.getElementById("seccionCargas").hidden = false
    document.getElementById("seccionAhorro").hidden = false
    mostrarCamposAhorro()
    await Promise.all([cargarRelaciones(), cargarSituaciones(), cargarPrevisiones(), cargarTramos(), cargarCargas(), cargarAhorros()])
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

// ---------- Historial de previsión ----------

const DESDE_SIEMPRE = "1900-01-01"

function textoDesde(desde) {
    const texto = String(desde).slice(0, 10)
    return texto === DESDE_SIEMPRE ? "Desde siempre" : texto.slice(0, 7).split("-").reverse().join("-")
}

async function cargarPrevisiones() {
    const resultado = await llamarApi(`/api/personas/${personaId}/previsiones`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el historial de previsión")
        return
    }
    document.getElementById("previsiones").innerHTML = `<table>
        <thead><tr><th>Desde</th><th>AFP</th><th>Salud</th><th>Plan (UF)</th><th></th></tr></thead>
        <tbody>${resultado.datos.map((p) => `
            <tr>
                <td>${escaparHtml(textoDesde(p.desde))}</td>
                <td>${escaparHtml(p.Afp?.nombre ?? "Sin AFP")}</td>
                <td>${escaparHtml(p.sistema_salud === "Isapre" ? (p.Isapre?.nombre ?? "Isapre") : (p.sistema_salud ?? "Sin informar"))}</td>
                <td class="numero">${p.sistema_salud === "Isapre" ? escaparHtml(Number(p.plan_isapre_uf).toLocaleString("es-CL", { maximumFractionDigits: 4 })) : ""}</td>
                <td>${String(p.desde).slice(0, 10) === DESDE_SIEMPRE ? "" : `<button type="button" class="chico secundario" data-eliminar-prevision="${p.id}">Eliminar</button>`}</td>
            </tr>`).join("")}
        </tbody>
    </table>`
}

// Después de un cambio, la ficha muestra la previsión que quedó vigente hoy.
async function refrescarVigente() {
    const resultado = await llamarApi(`/api/personas/${personaId}`)
    if (resultado.status === 200) {
        persona = resultado.datos
        llenarFormulario(persona)
    }
}

function mostrarCamposIsaprePrevision() {
    const esIsapre = valor("prevSistema") === "Isapre"
    document.querySelectorAll(".solo-isapre-prev").forEach((campo) => { campo.hidden = !esIsapre })
    document.getElementById("prevIsapre").required = esIsapre
    document.getElementById("prevPlan").required = esIsapre
}
document.getElementById("prevSistema").addEventListener("change", mostrarCamposIsaprePrevision)

document.getElementById("prevInicial").addEventListener("change", function () {
    const desde = document.getElementById("prevDesde")
    desde.disabled = this.checked
    desde.required = !this.checked
})

document.getElementById("formPrevision").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const esIsapre = valor("prevSistema") === "Isapre"
    const inicial = document.getElementById("prevInicial").checked

    const creada = await crearRegistro(`/api/personas/${personaId}/previsiones`, {
        desde: inicial ? "siempre" : valor("prevDesde"),
        afp_id: numeroONulo("prevAfp"),
        sistema_salud: valor("prevSistema"),
        isapre_id: esIsapre ? numeroONulo("prevIsapre") : null,
        plan_isapre_uf: esIsapre ? valor("prevPlan") : null
    }, inicial ? "Previsión inicial corregida." : "Cambio de previsión registrado.")

    if (creada) {
        this.reset()
        document.getElementById("prevDesde").disabled = false
        mostrarCamposIsaprePrevision()
        await Promise.all([cargarPrevisiones(), refrescarVigente()])
    }
})

document.getElementById("previsiones").addEventListener("click", async function (evento) {
    const id = evento.target.closest("[data-eliminar-prevision]")?.dataset.eliminarPrevision
    if (!id || !confirm("¿Eliminar este cambio de previsión? Desde ese mes volverá a regir el registro anterior.")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/personas/${personaId}/previsiones/${id}`, { method: "DELETE" })
    if (resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    mensaje("info", "Cambio de previsión eliminado.")
    await Promise.all([cargarPrevisiones(), refrescarVigente()])
})

// ---------- Cargas familiares ----------

const RELACIONES = {
    hijo: "Hijo o hija", conyuge: "Cónyuge", conviviente_civil: "Conviviente civil", nieto: "Nieto o nieta",
    madre_viuda: "Madre viuda", ascendiente: "Ascendiente", propia: "La propia trabajadora", otro: "Otra"
}
const TIPOS_CARGA = { simple: "Simple", maternal: "Maternal", invalidez: "Invalidez" }
let cargas = []
let cargaEnEdicion = null

const mesTexto = (fecha) => String(fecha).slice(0, 7).split("-").reverse().join("-")

// Aviso cuando un registro toca meses ya cerrados: esas liquidaciones no cambian.
function avisoMesesCerrados(textoExito, meses) {
    if (!meses || meses.length === 0) {
        mensaje("info", textoExito)
        return
    }
    mensaje("info", `${textoExito} Ojo: alcanza meses ya cerrados (${meses.map(mesTexto).join(", ")}). Esas liquidaciones no cambian; si corresponde, paga la diferencia como «Asignación familiar retroactiva» en las variables del mes en curso.`)
}

async function cargarTramos() {
    const resultado = await llamarApi(`/api/personas/${personaId}/tramos-asignacion`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el tramo de asignación familiar")
        return
    }
    document.getElementById("tramosAsignacion").innerHTML = resultado.datos.length === 0
        ? `<p class="texto-suave">Sin tramo registrado: se informa tramo D (sin derecho). Si la persona tiene cargas vigentes, la liquidación pedirá registrar el tramo.</p>`
        : `<table>
            <thead><tr><th>Desde</th><th>Tramo</th><th>Documento</th><th></th></tr></thead>
            <tbody>${resultado.datos.map((t) => `
                <tr>
                    <td>${escaparHtml(mesTexto(t.desde))}</td>
                    <td>${escaparHtml(t.tramo)}</td>
                    <td>${escaparHtml(t.documento ?? "")}</td>
                    <td><button type="button" class="chico secundario" data-eliminar-tramo="${t.id}">Eliminar</button></td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

document.getElementById("formTramo").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const creado = await crearRegistro(`/api/personas/${personaId}/tramos-asignacion`, {
        desde: valor("tramoDesde"),
        tramo: valor("tramoValor"),
        documento: textoONulo("tramoDocumento")
    }, "Tramo registrado.")
    if (creado) {
        avisoMesesCerrados("Tramo registrado.", creado.meses_cerrados)
        this.reset()
        cargarTramos()
    }
})

document.getElementById("tramosAsignacion").addEventListener("click", async function (evento) {
    const id = evento.target.closest("[data-eliminar-tramo]")?.dataset.eliminarTramo
    if (!id || !confirm("¿Eliminar este tramo? Desde ese mes volverá a regir el tramo anterior.")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/personas/${personaId}/tramos-asignacion/${id}`, { method: "DELETE" })
    if (resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    mensaje("info", "Tramo eliminado.")
    cargarTramos()
})

function estadoCarga(carga) {
    const hoy = new Date().toISOString().slice(0, 10)
    if (carga.desde > hoy) {
        return "Futura"
    }
    return carga.hasta !== null && carga.hasta < hoy ? "Vencida" : "Vigente"
}

async function cargarCargas() {
    const resultado = await llamarApi(`/api/personas/${personaId}/cargas`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las cargas familiares")
        return
    }
    cargas = resultado.datos
    document.getElementById("cargasFamiliares").innerHTML = cargas.length === 0
        ? `<p class="texto-suave">Sin cargas registradas.</p>`
        : `<table>
            <thead><tr><th>Nombre</th><th>RUT</th><th>Relación</th><th>Tipo</th><th>Desde</th><th>Hasta</th><th>Documento</th><th>Estado</th><th></th></tr></thead>
            <tbody>${cargas.map((c) => `
                <tr>
                    <td>${escaparHtml(c.nombre)}</td>
                    <td>${c.rut ? escaparHtml(formatearRut(c.rut, c.dv)) : ""}</td>
                    <td>${escaparHtml(RELACIONES[c.relacion] ?? c.relacion)}</td>
                    <td>${escaparHtml(TIPOS_CARGA[c.tipo] ?? c.tipo)}</td>
                    <td>${escaparHtml(fechaCorta(c.desde))}</td>
                    <td>${escaparHtml(c.hasta ? fechaCorta(c.hasta) : "Sin término")}</td>
                    <td>${escaparHtml(c.documento ?? "")}</td>
                    <td>${escaparHtml(estadoCarga(c))}</td>
                    <td>
                        <button type="button" class="chico secundario" data-editar-carga="${c.id}">Editar</button>
                        <button type="button" class="chico secundario" data-eliminar-carga="${c.id}">Eliminar</button>
                    </td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

// "12.345.678-9" → { rut: "12345678", dv: "9" }. Vacío → sin RUT.
function rutDeCarga() {
    const texto = valor("cargaRut").replace(/[.\s]/g, "")
    if (texto === "") {
        return { rut: null, dv: null }
    }
    const [rut, dv] = texto.includes("-") ? texto.split("-") : [texto.slice(0, -1), texto.slice(-1)]
    return { rut, dv }
}

function terminarEdicionCarga() {
    cargaEnEdicion = null
    document.getElementById("formCarga").reset()
    document.getElementById("botonCarga").textContent = "Registrar carga"
    document.getElementById("cancelarCarga").hidden = true
}

document.getElementById("cancelarCarga").addEventListener("click", terminarEdicionCarga)

document.getElementById("formCarga").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const datos = {
        nombre: valor("cargaNombre"),
        ...rutDeCarga(),
        relacion: valor("cargaRelacion"),
        tipo: valor("cargaTipo"),
        desde: valor("cargaDesde"),
        hasta: textoONulo("cargaHasta"),
        documento: textoONulo("cargaDocumento")
    }

    const editando = cargaEnEdicion !== null
    let guardada
    if (!editando) {
        guardada = await crearRegistro(`/api/personas/${personaId}/cargas`, datos, "Carga registrada.")
    } else {
        const resultado = await llamarApi(`/api/personas/${personaId}/cargas/${cargaEnEdicion}`, { method: "PUT", body: JSON.stringify(datos) })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo guardar")
            return
        }
        guardada = resultado.datos
    }

    if (guardada) {
        terminarEdicionCarga()
        await cargarCargas()
        avisoMesesCerrados(editando ? "Carga actualizada." : "Carga registrada.", guardada.meses_cerrados)
    }
})

document.getElementById("cargasFamiliares").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar-carga]")?.dataset.editarCarga
    if (editar) {
        const carga = cargas.find((c) => String(c.id) === editar)
        cargaEnEdicion = carga.id
        document.getElementById("cargaNombre").value = carga.nombre
        document.getElementById("cargaRut").value = carga.rut ? formatearRut(carga.rut, carga.dv) : ""
        document.getElementById("cargaRelacion").value = carga.relacion
        document.getElementById("cargaTipo").value = carga.tipo
        document.getElementById("cargaDesde").value = carga.desde
        document.getElementById("cargaHasta").value = carga.hasta ?? ""
        document.getElementById("cargaDocumento").value = carga.documento ?? ""
        document.getElementById("botonCarga").textContent = "Guardar cambios"
        document.getElementById("cancelarCarga").hidden = false
        document.getElementById("cargaNombre").focus()
        return
    }

    const id = evento.target.closest("[data-eliminar-carga]")?.dataset.eliminarCarga
    if (!id || !confirm("¿Eliminar esta carga? Si fue un error de registro, elimínala; si el documento venció, mejor indica su fecha de término.")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/personas/${personaId}/cargas/${id}`, { method: "DELETE" })
    if (resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    if (String(cargaEnEdicion) === id) {
        terminarEdicionCarga()
    }
    mensaje("info", "Carga eliminada.")
    cargarCargas()
})

// ---------- Ahorro previsional voluntario ----------

const TIPOS_AHORRO = { apvi: "APV individual", apvc: "APV colectivo", deposito_convenido: "Depósito convenido" }
let ahorros = []
let ahorroEnEdicion = null

function textoMonto(modalidad, valor) {
    if (valor === null || valor === undefined) {
        return ""
    }
    const numero = Number(valor)
    if (modalidad === "uf") {
        return `${numero.toLocaleString("es-CL", { maximumFractionDigits: 4 })} UF`
    }
    if (modalidad === "porcentaje") {
        return `${numero.toLocaleString("es-CL", { maximumFractionDigits: 4 })} %`
    }
    return pesos(numero)
}

function estadoAhorro(ahorro) {
    const mesActual = new Date().toISOString().slice(0, 7)
    if (ahorro.desde.slice(0, 7) > mesActual) {
        return "Futuro"
    }
    return ahorro.hasta !== null && ahorro.hasta.slice(0, 7) < mesActual ? "Terminado" : "Vigente"
}

async function cargarAhorros() {
    const resultado = await llamarApi(`/api/personas/${personaId}/ahorros-voluntarios`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el ahorro previsional voluntario")
        return
    }
    ahorros = resultado.datos
    document.getElementById("ahorrosVoluntarios").innerHTML = ahorros.length === 0
        ? `<p class="texto-suave">Sin APV ni depósitos convenidos registrados.</p>`
        : `<table>
            <thead><tr><th>Tipo</th><th>Institución</th><th>Contrato</th><th>Régimen</th><th>Trabajador</th><th>Empleador</th><th>Desde</th><th>Hasta</th><th>Estado</th><th></th></tr></thead>
            <tbody>${ahorros.map((a) => `
                <tr>
                    <td>${escaparHtml(TIPOS_AHORRO[a.tipo] ?? a.tipo)}</td>
                    <td>${escaparHtml(a.institucion_nombre)} (${escaparHtml(a.institucion_codigo)})</td>
                    <td>${escaparHtml(a.numero_contrato ?? "")}</td>
                    <td>${escaparHtml(a.regimen ?? "")}</td>
                    <td class="numero">${escaparHtml(textoMonto(a.modalidad, a.monto))}</td>
                    <td class="numero">${escaparHtml(a.tipo === "deposito_convenido" ? "" : textoMonto(a.modalidad, a.aporte_empleador))}</td>
                    <td>${escaparHtml(mesTexto(a.desde))}</td>
                    <td>${escaparHtml(a.hasta ? mesTexto(a.hasta) : "Sin término")}</td>
                    <td>${escaparHtml(estadoAhorro(a))}</td>
                    <td>
                        <button type="button" class="chico secundario" data-editar-ahorro="${a.id}">Editar</button>
                        <button type="button" class="chico secundario" data-eliminar-ahorro="${a.id}">Eliminar</button>
                    </td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

// Muestra u oculta los campos según el tipo y la institución elegidos.
function mostrarCamposAhorro() {
    const tipo = valor("ahoTipo")
    const regimen = document.getElementById("ahoRegimen")
    document.querySelectorAll(".solo-apv").forEach((campo) => { campo.hidden = tipo === "deposito_convenido" })
    regimen.required = tipo !== "deposito_convenido"
    document.querySelectorAll(".solo-apvc").forEach((campo) => { campo.hidden = tipo !== "apvc" })
    document.getElementById("ahoMontoTexto").textContent = tipo === "apvc" ? "Monto del trabajador" : tipo === "deposito_convenido" ? "Monto del depósito" : "Monto"

    const otra = valor("ahoInstitucion") === "otra"
    document.querySelectorAll(".solo-otra-institucion").forEach((campo) => { campo.hidden = !otra })
    document.getElementById("ahoCodigo").required = otra
    document.getElementById("ahoNombre").required = otra
}
document.getElementById("ahoTipo").addEventListener("change", mostrarCamposAhorro)
document.getElementById("ahoInstitucion").addEventListener("change", mostrarCamposAhorro)

function terminarEdicionAhorro() {
    ahorroEnEdicion = null
    document.getElementById("formAhorro").reset()
    document.getElementById("botonAhorro").textContent = "Registrar"
    document.getElementById("cancelarAhorro").hidden = true
    mostrarCamposAhorro()
}
document.getElementById("cancelarAhorro").addEventListener("click", terminarEdicionAhorro)

document.getElementById("formAhorro").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const tipo = valor("ahoTipo")
    const otra = valor("ahoInstitucion") === "otra"
    const afp = afpsApv.find((a) => a.codigo === valor("ahoInstitucion"))
    const datos = {
        tipo,
        institucion_codigo: otra ? valor("ahoCodigo") : valor("ahoInstitucion"),
        institucion_nombre: otra ? valor("ahoNombre") : afp?.nombre ?? "",
        numero_contrato: textoONulo("ahoContrato"),
        forma_pago: Number(valor("ahoFormaPago")),
        regimen: tipo === "deposito_convenido" ? null : valor("ahoRegimen"),
        modalidad: valor("ahoModalidad"),
        monto: valor("ahoMonto"),
        aporte_empleador: tipo === "apvc" ? textoONulo("ahoAporte") : null,
        desde: valor("ahoDesde"),
        hasta: textoONulo("ahoHasta")
    }

    const editando = ahorroEnEdicion !== null
    let guardado
    if (!editando) {
        guardado = await crearRegistro(`/api/personas/${personaId}/ahorros-voluntarios`, datos, "Registrado.")
    } else {
        const resultado = await llamarApi(`/api/personas/${personaId}/ahorros-voluntarios/${ahorroEnEdicion}`, { method: "PUT", body: JSON.stringify(datos) })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo guardar")
            return
        }
        guardado = resultado.datos
    }

    if (guardado) {
        terminarEdicionAhorro()
        await cargarAhorros()
        avisoMesesCerrados(editando ? "Cambios guardados." : `${TIPOS_AHORRO[tipo]} registrado.`, guardado.meses_cerrados)
    }
})

document.getElementById("ahorrosVoluntarios").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar-ahorro]")?.dataset.editarAhorro
    if (editar) {
        const a = ahorros.find((x) => String(x.id) === editar)
        ahorroEnEdicion = a.id
        const esAfp = afpsApv.some((x) => x.codigo === a.institucion_codigo)
        document.getElementById("ahoTipo").value = a.tipo
        document.getElementById("ahoInstitucion").value = esAfp ? a.institucion_codigo : "otra"
        document.getElementById("ahoCodigo").value = esAfp ? "" : a.institucion_codigo
        document.getElementById("ahoNombre").value = esAfp ? "" : a.institucion_nombre
        document.getElementById("ahoContrato").value = a.numero_contrato ?? ""
        document.getElementById("ahoFormaPago").value = String(a.forma_pago)
        document.getElementById("ahoRegimen").value = a.regimen ?? "A"
        document.getElementById("ahoModalidad").value = a.modalidad
        document.getElementById("ahoMonto").value = Number(a.monto)
        document.getElementById("ahoAporte").value = a.aporte_empleador === null ? "" : Number(a.aporte_empleador)
        document.getElementById("ahoDesde").value = a.desde.slice(0, 7)
        document.getElementById("ahoHasta").value = a.hasta ? a.hasta.slice(0, 7) : ""
        document.getElementById("botonAhorro").textContent = "Guardar cambios"
        document.getElementById("cancelarAhorro").hidden = false
        mostrarCamposAhorro()
        document.getElementById("ahoTipo").focus()
        return
    }

    const id = evento.target.closest("[data-eliminar-ahorro]")?.dataset.eliminarAhorro
    if (!id || !confirm("¿Eliminar este registro? Si el ahorro terminó, mejor indica su mes hasta.")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/personas/${personaId}/ahorros-voluntarios/${id}`, { method: "DELETE" })
    if (resultado.status !== 204) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    if (String(ahorroEnEdicion) === id) {
        terminarEdicionAhorro()
    }
    mensaje("info", "Registro eliminado.")
    await cargarAhorros()
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
