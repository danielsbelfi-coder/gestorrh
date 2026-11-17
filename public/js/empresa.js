requiereLogin()

const empresaId = new URLSearchParams(location.search).get("id")
const formulario = document.getElementById("formEmpresa")

// Copia de CCAF en src/empresas/datos_empresa.js
const CCAF = {
    los_andes: "Caja Los Andes",
    la_araucana: "Caja La Araucana",
    los_heroes: "Caja Los Héroes",
    "18_septiembre": "Caja 18 de Septiembre"
}

const CAMPOS_TEXTO = ["tipo_empleador", "nombres", "apellido_paterno", "apellido_materno", "razon_social", "nombre_fantasia",
    "giro", "codigo_actividad", "direccion", "telefono", "email", "representante_legal_nombre", "representante_legal_rut",
    "representante_legal_email", "mutualidad_id", "tasa_adicional_mutual", "ccaf", "ccaf_agencia", "ccaf_numero_socio",
    "regla_fecha_pago", "dia_pago"]

const campoComuna = document.getElementById("comuna")
const OPCIONES_COMUNA = Object.entries(COMUNAS).map(([codigo, nombre]) => ({ id: codigo, texto: `${nombre} (${codigo})` }))
llenarBuscador(campoComuna, OPCIONES_COMUNA)
llenarSelect(document.getElementById("ccaf"), Object.entries(CCAF).map(([id, texto]) => ({ id, texto })), "Sin caja de compensación")

function valor(id) {
    return document.getElementById(id).value.trim()
}

function mostrarSegunTipo() {
    const natural = valor("tipo_empleador") === "natural"
    document.querySelectorAll(".solo-natural").forEach((campo) => { campo.hidden = !natural })
    const conCaja = valor("ccaf") !== ""
    document.querySelectorAll(".solo-ccaf").forEach((campo) => { campo.hidden = !conCaja })
    document.getElementById("campoDiaPago").hidden = valor("regla_fecha_pago") !== "dia_mes_siguiente"
}

document.getElementById("tipo_empleador").addEventListener("change", mostrarSegunTipo)
document.getElementById("ccaf").addEventListener("change", mostrarSegunTipo)
document.getElementById("regla_fecha_pago").addEventListener("change", mostrarSegunTipo)

// Mutualidades activas; si la empresa tiene una inactiva asignada, se agrega para no perder el dato al guardar.
async function cargarMutualidades(actual) {
    const resultado = await llamarApi("/api/mutualidades")
    const lista = resultado.status === 200 ? resultado.datos : []
    const visibles = lista.filter((m) => m.estado !== "inactivo" || m.id === actual)
    llenarSelect(document.getElementById("mutualidad_id"),
        visibles.map((m) => ({ id: m.id, texto: m.estado === "inactivo" ? `${m.nombre} (inactiva)` : m.nombre })),
        "Sin mutualidad (ISL)")
}

function mostrarEmpresa(empresa) {
    document.title = `GestorRH - ${empresa.razon_social}`
    document.getElementById("titulo").textContent = empresa.razon_social
    document.getElementById("subtitulo").textContent = `RUT ${formatearRut(empresa.rut, empresa.dv)} · ID ${empresa.id}`
    document.getElementById("estadoActual").innerHTML = empresa.estado === "inactiva"
        ? `<span class="insignia advertencia">Inactiva</span>` : `<span class="insignia exito">Activa</span>`
    for (const campo of CAMPOS_TEXTO) {
        document.getElementById(campo).value = empresa[campo] ?? ""
    }
    if (!empresa.tipo_empleador) {
        document.getElementById("tipo_empleador").value = "juridica"
    }
    document.getElementById("es_agricola").checked = empresa.es_agricola === true
    campoComuna.value = OPCIONES_COMUNA.find((opcion) => opcion.id === empresa.comuna)?.texto ?? ""
    mostrarSegunTipo()
}

// Tasas que el sistema ya suma por su cuenta al seguro de accidentes (básica y Ley SANNA vigentes hoy).
let tasasBaseMutual = null

function formatoTasa(numero) {
    return numero.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function actualizarResumenTasaMutual() {
    const elemento = document.getElementById("resumenTasaMutual")
    if (tasasBaseMutual === null) {
        elemento.textContent = ""
        return
    }
    const adicional = Number(document.getElementById("tasa_adicional_mutual").value) || 0
    const total = tasasBaseMutual.basica + tasasBaseMutual.sanna + adicional
    elemento.textContent = `Se cotizará ${formatoTasa(total)} % = básica ${formatoTasa(tasasBaseMutual.basica)} % + Ley SANNA ${formatoTasa(tasasBaseMutual.sanna)} % + adicional ${formatoTasa(adicional)} %.`
}

async function cargarTasasBaseMutual() {
    const hoy = new Date().toISOString().slice(0, 10)
    const [basica, sanna] = await Promise.all([
        llamarApi(`/api/parametros-legales/MUTUAL_TASA_BASICA/vigente?fecha=${hoy}`),
        llamarApi(`/api/parametros-legales/LEY_SANNA/vigente?fecha=${hoy}`)
    ])
    // Si el mes todavía no tiene parámetros cargados, simplemente no se muestra el resumen.
    if (basica.status === 200 && sanna.status === 200) {
        tasasBaseMutual = { basica: Number(basica.datos.valor), sanna: Number(sanna.datos.valor) }
    }
    actualizarResumenTasaMutual()
}

document.getElementById("tasa_adicional_mutual").addEventListener("input", actualizarResumenTasaMutual)

async function cargarEmpresa() {
    if (!empresaId) {
        mensaje("error", "Falta la empresa. Vuelve a la lista y elige una.")
        return
    }
    const resultado = await llamarApi(`/api/empresas/${empresaId}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar la empresa")
        return
    }
    await cargarMutualidades(resultado.datos.mutualidad_id)
    mostrarEmpresa(resultado.datos)
    await cargarTasasBaseMutual()
    formulario.hidden = false
    await cargarSucursales()
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    // La comuna del empleador es el lugar que aparece en los contratos ("En Curicó, a …").
    const comuna = valorBuscador(campoComuna)
    if (campoComuna.value.trim() !== "" && comuna === null) {
        mensaje("error", "Elige una comuna de la lista de sugerencias")
        return
    }

    const natural = valor("tipo_empleador") === "natural"
    const datos = {
        tipo_empleador: valor("tipo_empleador"),
        nombres: natural ? valor("nombres") : null,
        apellido_paterno: natural ? valor("apellido_paterno") : null,
        apellido_materno: natural ? valor("apellido_materno") : null,
        razon_social: valor("razon_social"),
        nombre_fantasia: valor("nombre_fantasia"),
        giro: valor("giro"),
        codigo_actividad: valor("codigo_actividad"),
        direccion: valor("direccion"),
        comuna,
        telefono: valor("telefono"),
        email: valor("email"),
        representante_legal_nombre: valor("representante_legal_nombre"),
        representante_legal_rut: valor("representante_legal_rut"),
        representante_legal_email: valor("representante_legal_email"),
        mutualidad_id: valor("mutualidad_id") === "" ? null : Number(valor("mutualidad_id")),
        ccaf: valor("ccaf"),
        ccaf_agencia: valor("ccaf_agencia"),
        ccaf_numero_socio: valor("ccaf_numero_socio"),
        es_agricola: document.getElementById("es_agricola").checked,
        regla_fecha_pago: valor("regla_fecha_pago") || null,
        dia_pago: valor("regla_fecha_pago") === "dia_mes_siguiente" && valor("dia_pago") !== "" ? Number(valor("dia_pago")) : null
    }
    if (valor("tasa_adicional_mutual") !== "") {
        datos.tasa_adicional_mutual = Number(valor("tasa_adicional_mutual"))
    }

    const resultado = await llamarApi(`/api/empresas/${empresaId}`, { method: "PATCH", body: JSON.stringify(datos) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron guardar los cambios")
        window.scrollTo({ top: 0, behavior: "smooth" })
        return
    }
    mostrarEmpresa(resultado.datos)
    mensaje("info", "Cambios guardados.")
    window.scrollTo({ top: 0, behavior: "smooth" })
})

// ---------- Sucursales (la casa matriz es la dirección y comuna de arriba) ----------

const campoComunaSucursal = document.getElementById("sucursalComuna")
llenarBuscador(campoComunaSucursal, OPCIONES_COMUNA)
let sucursalEnEdicion = null
let sucursales = []

const tablaSucursales = crearTabla({
    contenedor: "tablaSucursales",
    textoBuscar: "Buscar sucursal…",
    vacio: "La empresa no tiene sucursales: los contratos se hacen en la casa matriz o en un lugar escrito a mano.",
    columnas: [
        { titulo: "Nombre", valor: (s) => s.nombre },
        { titulo: "Dirección", valor: (s) => s.direccion },
        { titulo: "Comuna", valor: (s) => COMUNAS[s.comuna] ?? s.comuna },
        { titulo: "Estado", valor: (s) => (s.activo ? "Activa" : "Inactiva"), html: (s) => `<span class="insignia ${s.activo ? "exito" : "advertencia"}">${s.activo ? "Activa" : "Inactiva"}</span>` },
        {
            titulo: "", orden: false, valor: () => "",
            html: (s) => `<button type="button" class="chico secundario" data-editar-sucursal="${s.id}">Editar</button>
                <button type="button" class="chico secundario" data-activo-sucursal="${s.id}">${s.activo ? "Desactivar" : "Reactivar"}</button>`
        }
    ]
})

async function cargarSucursales() {
    const resultado = await llamarApi(`/api/empresas/${empresaId}/sucursales`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las sucursales")
        return
    }
    sucursales = resultado.datos
    tablaSucursales.mostrar(sucursales)
    document.getElementById("panelSucursales").hidden = false
}

function salirDeEdicionSucursal() {
    sucursalEnEdicion = null
    document.getElementById("formSucursal").reset()
    document.getElementById("botonSucursal").textContent = "Agregar sucursal"
    document.getElementById("cancelarSucursal").hidden = true
}

document.getElementById("cancelarSucursal").addEventListener("click", salirDeEdicionSucursal)

document.getElementById("formSucursal").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const comuna = valorBuscador(campoComunaSucursal)
    if (comuna === null) {
        mensaje("error", "Elige la comuna de la sucursal de la lista de sugerencias")
        return
    }
    const datos = { nombre: valor("sucursalNombre"), direccion: valor("sucursalDireccion"), comuna }
    const resultado = sucursalEnEdicion
        ? await llamarApi(`/api/empresas/${empresaId}/sucursales/${sucursalEnEdicion}`, { method: "PATCH", body: JSON.stringify(datos) })
        : await llamarApi(`/api/empresas/${empresaId}/sucursales`, { method: "POST", body: JSON.stringify(datos) })
    if (resultado.status !== 200 && resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar la sucursal")
        return
    }
    mensaje("info", sucursalEnEdicion ? "Sucursal actualizada." : "Sucursal agregada.")
    salirDeEdicionSucursal()
    await cargarSucursales()
})

document.getElementById("tablaSucursales").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar-sucursal]")?.dataset.editarSucursal
    const cambiar = evento.target.closest("[data-activo-sucursal]")?.dataset.activoSucursal
    if (editar) {
        const s = sucursales.find((x) => String(x.id) === editar)
        sucursalEnEdicion = s.id
        document.getElementById("sucursalNombre").value = s.nombre
        document.getElementById("sucursalDireccion").value = s.direccion
        campoComunaSucursal.value = OPCIONES_COMUNA.find((opcion) => opcion.id === s.comuna)?.texto ?? ""
        document.getElementById("botonSucursal").textContent = "Guardar sucursal"
        document.getElementById("cancelarSucursal").hidden = false
        document.getElementById("formSucursal").scrollIntoView({ behavior: "smooth", block: "center" })
        return
    }
    if (cambiar) {
        limpiarMensajes()
        const s = sucursales.find((x) => String(x.id) === cambiar)
        const resultado = await llamarApi(`/api/empresas/${empresaId}/sucursales/${s.id}`, { method: "PATCH", body: JSON.stringify({ activo: !s.activo }) })
        if (resultado.status !== 200) {
            mensaje("error", resultado.datos?.error ?? "No se pudo cambiar la sucursal")
            return
        }
        mensaje("info", s.activo ? "Sucursal desactivada: ya no se ofrece en contratos nuevos." : "Sucursal reactivada.")
        await cargarSucursales()
    }
})

document.addEventListener("usuario-listo", cargarEmpresa)
