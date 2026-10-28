requiereLogin()

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
                ${c.estado_firma === "pendiente" ? `<button type="button" class="chico" data-firmar="${c.id}">Firmar</button>` : ""}`
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

    tabla.mostrar(deEmpresaActual(contratos, (c) => c.Trabajador?.empresa_id).map((contrato) => ({
        ...contrato,
        persona: personaPorId.get(contrato.Trabajador?.persona_id),
        cargo: cargoPorId.get(contrato.cargo_id)?.nombre
    })))

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

    llenarSelect(document.getElementById("cargoId"),
        deEmpresaActual(cargos).map((cargo) => ({ id: cargo.id, texto: cargo.nombre })), "Elige un cargo")
}

const formulario = document.getElementById("formCrearContratos")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const trabajadorId = valorBuscador(document.getElementById("trabajador"))
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

    const creado = await crearRegistro("/api/contratos", {
        trabajador_id: trabajadorId,
        tipo_contrato: document.getElementById("tipoContrato").value,
        fecha_inicio: document.getElementById("fechaInicio").value,
        fecha_termino: document.getElementById("fechaTermino").value || null,
        comuna_prestacion: comuna,
        cargo_id: Number(document.getElementById("cargoId").value),
        funciones: document.getElementById("funciones").value.trim(),
        lugar_prestacion_servicios: document.getElementById("lugarPrestacionServicios").value.trim(),
        tipo_jornada: document.getElementById("tipoJornada").value,
        horas_semanales: document.getElementById("horasSemanales").value,
        dias_trabajados: document.getElementById("diasTrabajados").value,
        sistema_remuneracion: document.getElementById("sistemaRemuneracion").value,
        sueldo_base: document.getElementById("sueldoBase").value,
        periodicidad_pago: document.getElementById("periodicidadPago").value
    }, "Contrato creado.")

    if (creado) {
        cerrarPanelCrear(formulario)
        location.href = `trabajador.html?id=${creado.trabajador_id}`
    }
})

document.getElementById("tablaContratos").addEventListener("click", async function (evento) {
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

document.addEventListener("empresa-lista", cargarContratos)
