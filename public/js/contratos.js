requiereLogin()

let contratosEmpresa = []
// Paquete AE: descanso dominical (art. 38).
const TEXTO_ART38 = { ninguna: "", n2: "N° 2", n7: "N° 7", otra: "Otra" }
let contratoDomingos = null
let contratoEnCorreccion = null

function sinFirmar(c) {
    return c.estado === "vigente" && c.estado_firma === "pendiente"
}

const tabla = crearTabla({
    contenedor: "tablaContratos",
    textoBuscar: "Buscar por trabajador, RUT o cargo…",
    vacio: "Esta empresa todavía no tiene contratos.",
    columnas: [
        { titulo: "ID", valor: (c) => c.id, numero: true },
        {
            titulo: "Trabajador", valor: (c) => nombreCompleto(c.persona),
            html: (c) => `<a href="trabajador.html?id=${c.trabajador_id}">${escaparHtml(nombreCompleto(c.persona) || "Trabajador " + c.trabajador_id)}</a>`
        },
        { titulo: "RUT", valor: (c) => formatearRut(c.persona?.rut, c.persona?.dv) },
        { titulo: "Tipo", valor: (c) => TEXTOS.tipoContrato[c.tipo_contrato] ?? c.tipo_contrato },
        { titulo: "Cargo", valor: (c) => c.cargo ?? "" },
        { titulo: "Inicio", valor: (c) => c.fecha_inicio ?? "", html: (c) => escaparHtml(fechaCorta(c.fecha_inicio)) },
        { titulo: "Término", valor: (c) => terminoDelContrato(c), html: (c) => escaparHtml(terminoDelContrato(c)) },
        { titulo: "Sueldo base", valor: (c) => Number(c.sueldo_base), html: (c) => escaparHtml(pesos(c.sueldo_base)), numero: true },
        { titulo: "Art. 38", valor: (c) => TEXTO_ART38[c.art38_causal] ?? "" },
        { titulo: "Firma", valor: (c) => textoEstado("firma", c.estado_firma), html: (c) => insignia("firma", c.estado_firma) },
        { titulo: "Estado", valor: (c) => textoEstado("contrato", c.estado), html: (c) => insignia("contrato", c.estado) },
        {
            titulo: "", orden: false, valor: () => "",
            html: (c) => `<a class="boton secundario chico" href="trabajador.html?id=${c.trabajador_id}">Ficha</a>
                <button type="button" class="chico secundario" data-pdf="${c.id}">PDF</button>
                ${sinFirmar(c) ? `<button type="button" class="chico" data-firmar="${c.id}">Firmar</button>
                    <button type="button" class="chico secundario" data-corregir="${c.id}">Corregir</button>
                    <button type="button" class="chico peligro" data-anular="${c.id}">Anular</button>` : ""}
                ${c.estado === "vigente" ? `<button type="button" class="chico secundario" data-domingos="${c.id}">Domingos</button>` : ""}
                ${c.estado === "vigente" && c.estado_firma === "firmado" ? `<button type="button" class="chico peligro" data-anular="${c.id}" data-firmado="si">Anular (error)</button>` : ""}`
        }
    ],
    filtros: [
        { titulo: "Estado", valor: (c) => c.estado, opciones: opcionesDe("contrato") },
        { titulo: "Firma", valor: (c) => c.estado_firma, opciones: opcionesDe("firma") }
    ]
})

async function cargarContratos() {
    const listas = await cargarListas(["/api/contratos", "/api/trabajadores", "/api/personas", "/api/cargos"])
    if (!listas) {
        return
    }
    const [contratos, trabajadores, personas, cargos] = listas
    const personaPorId = porId(personas)
    const cargoPorId = porId(cargos)
    const trabajadoresEmpresa = deEmpresaActual(trabajadores)

    contratosEmpresa = deEmpresaActual(contratos, (c) => c.Trabajador?.empresa_id).map((contrato) => ({
        ...contrato,
        persona: personaPorId.get(contrato.Trabajador?.persona_id),
        cargo: cargoPorId.get(contrato.cargo_id)?.nombre
    }))
    tabla.mostrar(contratosEmpresa)

    // Una relación terminada quedó cerrada y no recibe contratos (la recontratación es una relación nueva).
    llenarBuscador(document.getElementById("trabajador"), trabajadoresEmpresa.filter((t) => !t.fecha_termino).map((trabajador) => {
        const persona = personaPorId.get(trabajador.persona_id)
        return { id: trabajador.id, texto: `${persona ? textoPersona(persona) : "Persona " + trabajador.persona_id} · ${textoEstado("trabajador", trabajador.estado)} · #${trabajador.id}` }
    }))

    // Desde la ficha del trabajador se llega con ?trabajador=ID: el formulario queda abierto y con el trabajador elegido.
    const pedido = Number(new URLSearchParams(location.search).get("trabajador"))
    const campoTrabajador = document.getElementById("trabajador")
    const textoPedido = [...(campoTrabajador._opciones ?? new Map())].find(([, id]) => id === pedido)?.[0]
    if (textoPedido) {
        campoTrabajador.value = textoPedido
        document.getElementById("panelCrear").open = true
    }

    llenarBuscador(document.getElementById("comuna"),
        Object.entries(COMUNAS).map(([codigo, nombre]) => ({ id: codigo, texto: `${nombre} (${codigo})` })))

    await cargarJornadas()
    await cargarLugares()

    cargosDeLaEmpresa = deEmpresaActual(cargos)
    llenarSelect(document.getElementById("cargoId"),
        cargosDeLaEmpresa.map((cargo) => ({ id: cargo.id, texto: cargo.nombre })), "Elige un cargo")

    // Desde la ficha del trabajador se llega con ?corregir=ID.
    const corregir = Number(new URLSearchParams(location.search).get("corregir"))
    if (corregir && !contratoEnCorreccion) {
        abrirCorreccion(corregir)
    }
}

// ---------- Funciones: al elegir el cargo se sugieren las que tiene registradas (editables) ----------
let cargosDeLaEmpresa = []
let funcionesSugeridas = ""

document.getElementById("cargoId").addEventListener("change", function () {
    const campo = document.getElementById("funciones")
    const cargo = cargosDeLaEmpresa.find((c) => String(c.id) === document.getElementById("cargoId").value)
    const sugeridas = cargo?.descripcion ?? ""

    // Solo se reemplaza si el campo está vacío o todavía tiene lo que sugirió el cargo anterior: lo que la persona escribió no se pisa.
    if (campo.value.trim() === "" || campo.value === funcionesSugeridas) {
        campo.value = sugeridas
        funcionesSugeridas = sugeridas
    }
})

// ---------- Jornada: al elegir una plantilla, las horas y los días se toman de ella ----------
let jornadas = []

async function cargarJornadas() {
    const resultado = await llamarApi(`/api/jornadas?empresa_id=${empresaActual()}`)
    jornadas = resultado.status === 200 ? resultado.datos.filter((j) => j.activo || j.id === contratoEnCorreccion?.jornada_id) : []
    llenarSelect(document.getElementById("jornadaId"),
        jornadas.map((j) => ({ id: j.id, texto: `${j.nombre} (${Number(j.horas_semanales)} h)` })),
        "Sin plantilla: indicar horas y días a mano")
    aplicarJornada()
}

function aplicarJornada() {
    const excluido = document.getElementById("tipoJornada").value === "excluido_limitacion"
    const selector = document.getElementById("jornadaId")
    selector.disabled = excluido
    if (excluido) {
        selector.value = ""
    }
    const jornada = jornadas.find((j) => String(j.id) === selector.value)
    const horas = document.getElementById("horasSemanales")
    const dias = document.getElementById("diasTrabajados")
    horas.readOnly = Boolean(jornada)
    dias.readOnly = Boolean(jornada)
    if (jornada) {
        horas.value = Number(jornada.horas_semanales)
        dias.value = Number(jornada.dias_trabajados)
    }
}

// ---------- Duración: el plazo fijo lleva fecha de término; la obra o faena, la obra, faena o hito que le pone término ----------
function aplicarTipoContrato() {
    const tipo = document.getElementById("tipoContrato").value
    const plazoFijo = tipo === "plazo_fijo"
    const obra = tipo === "obra_faena"
    document.getElementById("campoFechaTermino").hidden = !plazoFijo
    document.getElementById("fechaTermino").required = plazoFijo
    document.getElementById("campoObraFaena").hidden = !obra
    document.getElementById("obraFaena").required = obra
}

document.getElementById("tipoContrato").addEventListener("change", aplicarTipoContrato)
aplicarTipoContrato()

document.getElementById("jornadaId").addEventListener("change", aplicarJornada)
document.getElementById("tipoJornada").addEventListener("change", aplicarJornada)

// ---------- Lugar de trabajo: casa matriz, una sucursal u otro lugar escrito a mano ----------
// Con casa matriz o sucursal, el lugar y la comuna se llenan solos (el servidor los copia de ellas).
let empresaDeTrabajo = null
let sucursales = []

const textoComuna = (codigo) => (codigo && COMUNAS[codigo] ? `${COMUNAS[codigo]} (${codigo})` : "")
const lugarCasaMatriz = () => `Casa matriz, ${empresaDeTrabajo?.direccion ?? ""}`

async function cargarLugares() {
    const [empresa, lista] = await Promise.all([
        llamarApi(`/api/empresas/${empresaActual()}`),
        llamarApi(`/api/empresas/${empresaActual()}/sucursales`)
    ])
    empresaDeTrabajo = empresa.status === 200 ? empresa.datos : null
    sucursales = lista.status === 200 ? lista.datos : []
    llenarLugares()
}

function llenarLugares(sucursalActual = null) {
    const opciones = []
    if (empresaDeTrabajo?.comuna) {
        opciones.push({ id: "matriz", texto: `Casa matriz · ${empresaDeTrabajo.direccion} (${COMUNAS[empresaDeTrabajo.comuna] ?? empresaDeTrabajo.comuna})` })
    }
    for (const s of sucursales.filter((x) => x.activo || x.id === sucursalActual)) {
        opciones.push({ id: String(s.id), texto: `${s.nombre} · ${s.direccion} (${COMUNAS[s.comuna] ?? s.comuna})${s.activo ? "" : " · inactiva"}` })
    }
    opciones.push({ id: "otro", texto: "Otro lugar (escribir)" })
    llenarSelect(document.getElementById("lugarTrabajo"), opciones)
    aplicarLugar()
}

function aplicarLugar() {
    const eleccion = document.getElementById("lugarTrabajo").value
    const lugar = document.getElementById("lugarPrestacionServicios")
    const comuna = document.getElementById("comuna")
    const fijo = eleccion !== "otro"
    lugar.readOnly = fijo
    comuna.readOnly = fijo
    if (eleccion === "matriz") {
        lugar.value = lugarCasaMatriz()
        comuna.value = textoComuna(empresaDeTrabajo.comuna)
    } else if (fijo) {
        const s = sucursales.find((x) => String(x.id) === eleccion)
        lugar.value = s ? `${s.nombre}, ${s.direccion}` : ""
        comuna.value = textoComuna(s?.comuna)
    }
}

document.getElementById("lugarTrabajo").addEventListener("change", function () {
    // Al pasar a «Otro lugar» se deja escrito lo que había, para editarlo.
    aplicarLugar()
})

function datosDelLugar() {
    const eleccion = document.getElementById("lugarTrabajo").value
    if (eleccion === "matriz") {
        return { en_casa_matriz: true, sucursal_id: null }
    }
    if (eleccion !== "otro") {
        return { sucursal_id: Number(eleccion) }
    }
    return { sucursal_id: null }
}

const formulario = document.getElementById("formCrearContratos")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const trabajadorId = contratoEnCorreccion ? contratoEnCorreccion.trabajador_id : valorBuscador(document.getElementById("trabajador"))
    if (trabajadorId === null) {
        mensaje("error", "Elige un trabajador de la lista de sugerencias")
        return
    }

    const campoComuna = document.getElementById("comuna")
    const comuna = valorBuscador(campoComuna)
    if (campoComuna.value.trim() !== "" && comuna === null) {
        mensaje("error", "Elige una comuna de la lista de sugerencias")
        return
    }

    const datos = {
        tipo_contrato: document.getElementById("tipoContrato").value,
        fecha_inicio: document.getElementById("fechaInicio").value,
        // Solo el dato que corresponde al tipo: un campo escondido no se envía aunque tenga algo escrito.
        fecha_termino: document.getElementById("tipoContrato").value === "plazo_fijo" ? document.getElementById("fechaTermino").value || null : null,
        obra_faena_descripcion: document.getElementById("tipoContrato").value === "obra_faena" ? document.getElementById("obraFaena").value.trim() : null,
        comuna_prestacion: comuna,
        cargo_id: Number(document.getElementById("cargoId").value),
        funciones: document.getElementById("funciones").value.trim(),
        lugar_prestacion_servicios: document.getElementById("lugarPrestacionServicios").value.trim(),
        tipo_jornada: document.getElementById("tipoJornada").value,
        jornada_id: document.getElementById("jornadaId").value ? Number(document.getElementById("jornadaId").value) : null,
        horas_semanales: document.getElementById("horasSemanales").value,
        dias_trabajados: document.getElementById("diasTrabajados").value,
        sistema_remuneracion: document.getElementById("sistemaRemuneracion").value,
        sueldo_base: document.getElementById("sueldoBase").value,
        periodicidad_pago: document.getElementById("periodicidadPago").value,
        ...datosDelLugar()
    }

    if (contratoEnCorreccion) {
        const resultado = await llamarApi(`/api/contratos/${contratoEnCorreccion.id}`, { method: "PATCH", body: JSON.stringify(datos) })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo corregir el contrato")
            return
        }
        const trabajador = contratoEnCorreccion.trabajador_id
        salirDeCorreccion()
        location.href = `trabajador.html?id=${trabajador}`
        return
    }

    const creado = await crearRegistro("/api/contratos", { trabajador_id: trabajadorId, ...datos }, "Contrato creado.")

    if (creado) {
        cerrarPanelCrear(formulario)
        location.href = `trabajador.html?id=${creado.trabajador_id}`
    }
})


// ---------- Corrección de un contrato con la firma pendiente (reutiliza el formulario de creación) ----------

function abrirCorreccion(id) {
    const c = contratosEmpresa.find((x) => x.id === id)
    if (!c) {
        return
    }
    if (!sinFirmar(c)) {
        mensaje("error", "Solo se puede corregir un contrato vigente con la firma pendiente. Un contrato firmado se modifica con un anexo.")
        return
    }
    contratoEnCorreccion = c
    limpiarMensajes()

    const campoTrabajador = document.getElementById("trabajador")
    campoTrabajador.value = `${nombreCompleto(c.persona)} · ${formatearRut(c.persona?.rut, c.persona?.dv)}`
    campoTrabajador.disabled = true

    document.getElementById("tipoContrato").value = c.tipo_contrato
    document.getElementById("fechaInicio").value = c.fecha_inicio ?? ""
    document.getElementById("fechaTermino").value = c.fecha_termino ?? ""
    document.getElementById("obraFaena").value = c.obra_faena_descripcion ?? ""
    aplicarTipoContrato()
    document.getElementById("cargoId").value = String(c.cargo_id)
    document.getElementById("funciones").value = c.funciones ?? ""
    document.getElementById("lugarPrestacionServicios").value = c.lugar_prestacion_servicios ?? ""
    document.getElementById("comuna").value = c.comuna_prestacion && COMUNAS[c.comuna_prestacion] ? `${COMUNAS[c.comuna_prestacion]} (${c.comuna_prestacion})` : ""
    document.getElementById("tipoJornada").value = c.tipo_jornada
    document.getElementById("horasSemanales").value = Number(c.horas_semanales)
    document.getElementById("diasTrabajados").value = c.dias_trabajados
    document.getElementById("sistemaRemuneracion").value = c.sistema_remuneracion
    document.getElementById("sueldoBase").value = Number(c.sueldo_base)
    document.getElementById("periodicidadPago").value = c.periodicidad_pago

    cargarJornadas().then(() => {
        document.getElementById("jornadaId").value = c.jornada_id ? String(c.jornada_id) : ""
        aplicarJornada()
    })

    // Lugar: su sucursal (aunque esté inactiva), la casa matriz si el texto coincide, o lo escrito a mano.
    llenarLugares(c.sucursal_id)
    const selectorLugar = document.getElementById("lugarTrabajo")
    selectorLugar.value = c.sucursal_id ? String(c.sucursal_id)
        : (empresaDeTrabajo?.comuna && c.lugar_prestacion_servicios === lugarCasaMatriz() && c.comuna_prestacion === empresaDeTrabajo.comuna ? "matriz" : "otro")
    if (selectorLugar.value === "otro") {
        document.getElementById("lugarPrestacionServicios").value = c.lugar_prestacion_servicios ?? ""
        document.getElementById("comuna").value = textoComuna(c.comuna_prestacion)
    }
    aplicarLugar()

    document.getElementById("tituloPanel").textContent = `Corregir contrato #${c.id} (firma pendiente)`
    document.getElementById("botonGuardar").textContent = "Guardar corrección"
    document.getElementById("cancelarCorreccion").hidden = false
    const panel = document.getElementById("panelCrear")
    panel.open = true
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

function salirDeCorreccion() {
    contratoEnCorreccion = null
    formulario.reset()
    aplicarTipoContrato()
    document.getElementById("trabajador").disabled = false
    document.getElementById("tituloPanel").textContent = "＋ Nuevo contrato"
    document.getElementById("botonGuardar").textContent = "Crear contrato"
    document.getElementById("cancelarCorreccion").hidden = true
    cargarJornadas()
    llenarLugares()
}

document.getElementById("cancelarCorreccion").addEventListener("click", () => {
    salirDeCorreccion()
    document.getElementById("panelCrear").removeAttribute("open")
    history.replaceState(null, "", "contratos.html")
})

// ---------- Descanso dominical (paquete AE) ----------

function aplicarCausal() {
    const causal = document.getElementById("art38Causal").value
    document.getElementById("campoRecargoDomingo").hidden = causal !== "n7"
    document.getElementById("campoSoloFinSemana").hidden = causal === "ninguna"
}

function abrirDomingos(id) {
    contratoDomingos = contratosEmpresa.find((c) => String(c.id) === String(id))
    if (!contratoDomingos) {
        return
    }
    document.getElementById("tituloDomingos").textContent = `Descanso dominical (art. 38): ${nombreCompleto(contratoDomingos.persona)} · contrato #${contratoDomingos.id}`
    document.getElementById("art38Causal").value = contratoDomingos.art38_causal ?? "ninguna"
    document.getElementById("recargoDomingo").value = Number(contratoDomingos.recargo_domingo ?? 30)
    document.getElementById("soloFinSemana").checked = contratoDomingos.solo_fin_semana === true
    aplicarCausal()
    const panel = document.getElementById("panelDomingos")
    panel.hidden = false
    panel.scrollIntoView({ behavior: "smooth", block: "start" })
}

document.getElementById("art38Causal").addEventListener("change", aplicarCausal)
document.getElementById("cerrarDomingos").addEventListener("click", () => { document.getElementById("panelDomingos").hidden = true })

document.getElementById("formDomingos").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const causal = document.getElementById("art38Causal").value
    const resultado = await llamarApi(`/api/contratos/${contratoDomingos.id}/domingos`, {
        method: "PATCH",
        body: JSON.stringify({
            art38_causal: causal,
            recargo_domingo: causal === "n7" ? Number(document.getElementById("recargoDomingo").value) : null,
            solo_fin_semana: document.getElementById("soloFinSemana").checked
        })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar el descanso dominical")
        return
    }
    mensaje("info", "Descanso dominical actualizado. Rige para los libros y liquidaciones que se calculen desde ahora.")
    document.getElementById("panelDomingos").hidden = true
    cargarContratos()
})

document.getElementById("tablaContratos").addEventListener("click", async function (evento) {
    const domingos = evento.target.closest("[data-domingos]")?.dataset.domingos
    if (domingos) {
        abrirDomingos(domingos)
        return
    }
    const corregir = evento.target.closest("[data-corregir]")?.dataset.corregir
    if (corregir) {
        abrirCorreccion(Number(corregir))
        return
    }
    const anular = evento.target.closest("[data-anular]")?.dataset.anular
    if (anular) {
        limpiarMensajes()
        const firmado = evento.target.closest("[data-anular]").dataset.firmado === "si"
        if (await anularContratoConMotivo(Number(anular), { firmado })) {
            cargarContratos()
        }
        return
    }
    const pdf = evento.target.closest("[data-pdf]")?.dataset.pdf
    if (pdf) {
        limpiarMensajes()
        const resultado = await descargarArchivo(`/api/contratos/${pdf}/documento`)
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo generar el contrato")
        }
        return
    }
    const id = evento.target.closest("[data-firmar]")?.dataset.firmar
    if (!id) {
        return
    }
    // Un año mal digitado (2096 en vez de 2026) deja un contrato imposible de liquidar: se confirma un inicio lejano.
    const contrato = contratosEmpresa.find((c) => String(c.id) === String(id))
    if (contrato && !confirmarInicioLejano(contrato.fecha_inicio)) {
        return
    }
    const fecha = prompt("Fecha de firma del contrato (AAAA-MM-DD). Deja hoy si se firma ahora:", hoyIso())
    if (fecha === null) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/contratos/${id}/firmar`, { method: "PATCH", body: JSON.stringify({ fecha_firma: fecha.trim() }) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo firmar el contrato")
        return
    }
    mensaje("info", "Contrato firmado.")
    cargarContratos()
})

document.addEventListener("empresa-lista", () => { if (contratoEnCorreccion) { salirDeCorreccion() } cargarContratos() })
