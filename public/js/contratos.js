requiereLogin()

let contratosEmpresa = []
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
        { titulo: "Término", valor: (c) => c.fecha_termino ?? "", html: (c) => escaparHtml(fechaCorta(c.fecha_termino)) },
        { titulo: "Sueldo base", valor: (c) => Number(c.sueldo_base), html: (c) => escaparHtml(pesos(c.sueldo_base)), numero: true },
        { titulo: "Firma", valor: (c) => textoEstado("firma", c.estado_firma), html: (c) => insignia("firma", c.estado_firma) },
        { titulo: "Estado", valor: (c) => textoEstado("contrato", c.estado), html: (c) => insignia("contrato", c.estado) },
        {
            titulo: "", orden: false, valor: () => "",
            html: (c) => `<a class="boton secundario chico" href="trabajador.html?id=${c.trabajador_id}">Ficha</a>
                <button type="button" class="chico secundario" data-pdf="${c.id}">PDF</button>
                ${sinFirmar(c) ? `<button type="button" class="chico" data-firmar="${c.id}">Firmar</button>
                    <button type="button" class="chico secundario" data-corregir="${c.id}">Corregir</button>
                    <button type="button" class="chico peligro" data-anular="${c.id}">Anular</button>` : ""}`
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

    llenarBuscador(document.getElementById("trabajador"), trabajadoresEmpresa.map((trabajador) => {
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
        dias.value = jornada.dias_trabajados
    }
}

document.getElementById("jornadaId").addEventListener("change", aplicarJornada)
document.getElementById("tipoJornada").addEventListener("change", aplicarJornada)

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
        fecha_termino: document.getElementById("fechaTermino").value || null,
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
        periodicidad_pago: document.getElementById("periodicidadPago").value
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
    document.getElementById("trabajador").disabled = false
    document.getElementById("tituloPanel").textContent = "＋ Nuevo contrato"
    document.getElementById("botonGuardar").textContent = "Crear contrato"
    document.getElementById("cancelarCorreccion").hidden = true
    cargarJornadas()
}

document.getElementById("cancelarCorreccion").addEventListener("click", () => {
    salirDeCorreccion()
    document.getElementById("panelCrear").removeAttribute("open")
    history.replaceState(null, "", "contratos.html")
})

document.getElementById("tablaContratos").addEventListener("click", async function (evento) {
    const corregir = evento.target.closest("[data-corregir]")?.dataset.corregir
    if (corregir) {
        abrirCorreccion(Number(corregir))
        return
    }
    const anular = evento.target.closest("[data-anular]")?.dataset.anular
    if (anular) {
        limpiarMensajes()
        if (await anularContratoConMotivo(Number(anular))) {
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
