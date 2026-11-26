requiereLogin()

const campoMes = document.getElementById("mes")
let esSoporte = false
let parametros = []
let fechaUF = null // último día del mes elegido: la UF que usa la remuneración de ese mes

const TIPOS = { porcentaje: "Porcentaje", monto: "Monto", factor: "Factor", otro: "Otro" }

// Muestra el valor según su tipo: los topes en UF con "UF", los porcentajes con "%", los montos en pesos.
function valorParametro(p) {
    const numero = Number(p.valor)
    const texto = numero.toLocaleString("es-CL", { maximumFractionDigits: 4 })
    if (p.codigo.endsWith("_UF")) {
        return `${texto} UF`
    }
    if (p.tipo === "porcentaje") {
        return `${texto} %`
    }
    if (p.codigo === "UF" || p.codigo === "UTM" || p.tipo === "monto") {
        return `$${numero.toLocaleString("es-CL", { maximumFractionDigits: 2 })}`
    }
    return texto
}

const tabla = crearTabla({
    contenedor: "tablaParametros",
    textoBuscar: "Buscar por código o nombre…",
    vacio: "Este mes no tiene parámetros cargados.",
    columnas: [
        { titulo: "Código", valor: (p) => p.codigo },
        {
            titulo: "Nombre", valor: (p) => p.nombre ?? "",
            html: (p) => escaparHtml(p.codigo === "UF" && fechaUF ? `${p.nombre ?? "UF"} (al ${fechaCorta(fechaUF)})` : (p.nombre ?? ""))
        },
        { titulo: "Valor", valor: (p) => Number(p.valor), html: (p) => `<strong>${escaparHtml(valorParametro(p))}</strong>`, numero: true },
        { titulo: "Tipo", valor: (p) => TIPOS[p.tipo] ?? p.tipo },
        { titulo: "Vigencia", valor: (p) => p.vigencia_desde, html: (p) => escaparHtml(`${fechaCorta(p.vigencia_desde)} al ${p.vigencia_hasta ? fechaCorta(p.vigencia_hasta) : "sin término"}`) },
        { titulo: "Fuente", valor: (p) => [p.fuente, p.descripcion].filter(Boolean).join(" · ") },
        {
            titulo: "", orden: false, valor: () => "",
            html: (p) => esSoporte ? `<button type="button" class="chico secundario" data-corregir="${p.id}">Corregir</button>` : ""
        }
    ]
})

const tablaTramos = crearTabla({
    contenedor: "tablaTramos",
    textoBuscar: "Buscar…",
    vacio: "Este mes no tiene tramos del impuesto.",
    columnas: [
        { titulo: "Desde (UTM)", valor: (t) => Number(t.desde_utm), numero: true },
        { titulo: "Hasta (UTM)", valor: (t) => (t.hasta_utm === null ? "y más" : Number(t.hasta_utm)), numero: true },
        { titulo: "Tasa", valor: (t) => Number(t.tasa), html: (t) => escaparHtml(`${Number(t.tasa).toLocaleString("es-CL")}%`), numero: true },
        { titulo: "Rebaja (UTM)", valor: (t) => Number(t.rebaja_utm), numero: true }
    ]
})

function mesTexto() {
    return campoMes.value
}

function moverMes(delta) {
    const [anio, mes] = mesTexto().split("-").map(Number)
    const fecha = new Date(anio, mes - 1 + delta, 1)
    campoMes.value = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
    cargarMes()
}

async function cargarMes() {
    limpiarMensajes()
    document.getElementById("resultadoApertura").innerHTML = ""
    if (!mesTexto()) {
        return
    }
    const resultado = await llamarApi(`/api/parametros-legales/mes/${mesTexto()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar los parámetros")
        return
    }
    const datos = resultado.datos
    parametros = datos.parametros
    fechaUF = datos.fecha_uf ?? null
    tabla.mostrar(parametros)
    mostrarCargaMes(datos.faltantes)
    tablaTramos.mostrar(datos.tramos)
    await cargarFactores()
    await cargarExCajas()

    const nombreMes = nombrePeriodo({ mes: Number(mesTexto().slice(5, 7)), anio: Number(mesTexto().slice(0, 4)) })
    document.getElementById("estadoMes").innerHTML = datos.faltantes.length === 0
        ? `<span class="insignia exito">Completo</span> ${escaparHtml(nombreMes)} tiene todos los parámetros que necesita el cálculo.`
        : `<span class="insignia peligro">Incompleto</span> A ${escaparHtml(nombreMes)} le faltan: <strong>${escaparHtml(datos.faltantes.join(", "))}</strong>. Sin ellos no se pueden calcular las liquidaciones de este mes.${esSoporte ? "" : " La plataforma los carga cada mes; si ya es tiempo de liquidar, escribe a soporte."}`
}

// ---------- UF y UTM del mes (no se copian al abrir el mes) ----------
function mostrarCargaMes(faltantes) {
    const faltaUF = faltantes.includes("UF")
    const faltaUTM = faltantes.includes("UTM")
    document.getElementById("cargaMes").hidden = !esSoporte || (!faltaUF && !faltaUTM)
    document.getElementById("etiquetaUF").hidden = !faltaUF
    document.getElementById("etiquetaUTM").hidden = !faltaUTM
    document.getElementById("fechaUF").textContent = fechaUF ? fechaCorta(fechaUF) : "último día del mes"
}

document.getElementById("btnCargarMes").addEventListener("click", async function () {
    limpiarMensajes()
    const fuente = document.getElementById("fuenteCarga").value.trim()
    const cargas = [["UF", "valorUF"], ["UTM", "valorUTM"]]
        .filter(([codigo, campo]) => !document.getElementById(`etiqueta${codigo}`).hidden && document.getElementById(campo).value.trim() !== "")
        .map(([codigo, campo]) => ({ codigo, valor: document.getElementById(campo).value.trim().replace(",", ".") }))
    if (cargas.length === 0) {
        mensaje("error", "Escribe el valor de la UF o de la UTM.")
        return
    }
    for (const carga of cargas) {
        const resultado = await llamarApi("/api/parametros-legales/cargar-mes", {
            method: "POST",
            body: JSON.stringify({ mes: mesTexto(), codigo: carga.codigo, valor: carga.valor, fuente })
        })
        if (resultado.status !== 201) {
            mensaje("error", resultado.datos?.error ?? `No se pudo cargar la ${carga.codigo}`)
            await cargarMes()
            return
        }
    }
    document.getElementById("valorUF").value = ""
    document.getElementById("valorUTM").value = ""
    await cargarMes()
    cargarCambios()
    mensaje("info", `${cargas.map((c) => c.codigo).join(" y ")} cargada${cargas.length > 1 ? "s" : ""}.`)
})

// ---------- Factores de actualización de la DJ 1887 (del año del mes elegido) ----------
const NOMBRES_MES_FACTOR = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

async function cargarFactores() {
    const anio = mesTexto().slice(0, 4)
    document.getElementById("tituloFactores").textContent = `Factores de actualización DJ 1887 (año comercial ${anio})`
    const resultado = await llamarApi(`/api/factores-actualizacion/${anio}`)
    const factores = resultado.status === 200 ? resultado.datos.factores : {}
    document.getElementById("factoresDj").innerHTML = NOMBRES_MES_FACTOR.map((nombre, i) => {
        const valor = factores[i + 1]
        return esSoporte
            ? `<label>${nombre}<input type="number" step="0.001" min="0.001" max="2.999" data-mes="${i + 1}" value="${valor ?? ""}"></label>`
            : `<label>${nombre}<output>${valor === undefined ? "—" : escaparHtml(valor.toFixed(3).replace(".", ","))}</output></label>`
    }).join("")
    document.getElementById("accionesFactores").hidden = !esSoporte
}

document.getElementById("btnGuardarFactores").addEventListener("click", async () => {
    limpiarMensajes()
    const factores = [...document.querySelectorAll("#factoresDj input")].map((campo) => campo.value === "" ? null : Number(campo.value))
    const resultado = await llamarApi(`/api/factores-actualizacion/${mesTexto().slice(0, 4)}`, { method: "PUT", body: JSON.stringify({ factores }) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron guardar los factores")
        return
    }
    await cargarFactores()
    mensaje("info", "Factores guardados.")
})

async function abrirMes(confirmar) {
    limpiarMensajes()
    if (confirmar && !confirm(`¿Abrir los parámetros de ${mesTexto()} copiando los del mes anterior (menos la UF y la UTM)?`)) {
        return
    }
    const resultado = await llamarApi("/api/parametros-legales/abrir-mes", {
        method: "POST",
        body: JSON.stringify({ mes: mesTexto(), confirmar })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo abrir el mes")
        return
    }
    const r = resultado.datos
    document.getElementById("resultadoApertura").innerHTML = `
        <div class="resultado-apertura">
            <p><strong>${r.simulado ? "Simulación (no se guardó nada)" : "Mes abierto"}</strong>: desde ${escaparHtml(r.origen)} hacia ${escaparHtml(r.destino)}.</p>
            <p>Se ${r.simulado ? "copiarían" : "copiaron"} ${r.copiados.length} parámetro(s)${r.copiados.length ? `: ${escaparHtml(r.copiados.map((p) => `${p.codigo} = ${p.valor}`).join(", "))}` : ""}. Tramos del impuesto: ${r.tramosCopiados}.</p>
            ${r.sinCopiar.length ? `<p>No se copia${r.sinCopiar.length > 1 ? "n" : ""}: ${escaparHtml(r.sinCopiar.join(" ni "))} (se cargan con el valor oficial del mes).</p>` : ""}
            ${r.faltantes.length ? `<p class="nota peligro">Seguirán faltando: ${escaparHtml(r.faltantes.join(", "))}.</p>` : ""}
            ${r.simulado ? "" : `<p>Ahora carga la UF (último día del mes) y la UTM con los valores oficiales.</p>`}
        </div>`
    if (!r.simulado) {
        const aviso = document.getElementById("resultadoApertura").innerHTML
        await cargarMes()
        document.getElementById("resultadoApertura").innerHTML = aviso
        cargarCambios()
    }
}

document.getElementById("btnSimular").addEventListener("click", () => abrirMes(false))
document.getElementById("btnAbrir").addEventListener("click", () => abrirMes(true))
document.getElementById("mesAnterior").addEventListener("click", () => moverMes(-1))
document.getElementById("mesSiguiente").addEventListener("click", () => moverMes(1))
campoMes.addEventListener("change", cargarMes)

document.getElementById("tablaParametros").addEventListener("click", async function (evento) {
    const id = evento.target.closest("[data-corregir]")?.dataset.corregir
    if (!id) {
        return
    }
    const parametro = parametros.find((p) => String(p.id) === id)
    const ayuda = parametro.codigo === "UF" ? " (valor del último día del mes)" : ""
    const valor = prompt(`Nuevo valor de ${parametro.codigo}${ayuda}. Usa punto para los decimales:`, parametro.valor)
    if (valor === null) {
        return
    }
    const fuente = prompt("Fuente del valor (por ejemplo: SII, Banco Central, Ley N° …):", parametro.fuente ?? "")
    limpiarMensajes()
    const resultado = await llamarApi(`/api/parametros-legales/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ valor: valor.trim().replace(",", "."), ...(fuente !== null ? { fuente: fuente.trim() || null } : {}) })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo corregir el valor")
        return
    }
    await cargarMes()
    cargarCambios()
    mensaje("info", `${parametro.codigo} actualizado.`)
})

// ---------- Ex-cajas del IPS (paquete AG) ----------
const porcentaje = (n) => `${Number(n).toLocaleString("es-CL", { minimumFractionDigits: 2 })} %`

const tablaExCajas = crearTabla({
    contenedor: "tablaExCajas",
    textoBuscar: "Buscar ex-caja…",
    vacio: "No hay ex-cajas.",
    columnas: [
        { titulo: "LRE", valor: (c) => c.codigo_lre, numero: true },
        { titulo: "Previred", valor: (c) => c.codigo_previred },
        { titulo: "Ex-caja", valor: (c) => c.caja },
        { titulo: "Régimen", valor: (c) => c.regimen, numero: true },
        { titulo: "Previsión", valor: (c) => c.tasa?.tasa_prevision ?? -1, html: (c) => c.tasa ? escaparHtml(porcentaje(c.tasa.tasa_prevision)) : `<span class="insignia advertencia">Sin tasa</span>`, numero: true },
        { titulo: "Desahucio", valor: (c) => c.tasa?.tasa_desahucio ?? -1, html: (c) => c.codigo_desahucio ? (c.tasa ? escaparHtml(porcentaje(c.tasa.tasa_desahucio)) : "") : "No aplica", numero: true },
        { titulo: "Desde", valor: (c) => c.tasa?.desde ?? "", html: (c) => c.tasa ? escaparHtml(fechaCorta(c.tasa.desde)) : "" },
        { titulo: "Fuente", valor: (c) => c.tasa?.fuente ?? "" }
    ]
})

async function cargarExCajas() {
    const resultado = await llamarApi(`/api/ex-cajas?fecha=${mesTexto()}-01`)
    if (resultado.status !== 200) {
        return
    }
    // Primero las que tienen tasa (las que se usan), luego el resto por código.
    tablaExCajas.mostrar([...resultado.datos].sort((a, b) => (b.tasa ? 1 : 0) - (a.tasa ? 1 : 0) || a.codigo_lre - b.codigo_lre))
    const select = document.getElementById("tasaExCaja")
    if (select.options.length === 0) {
        llenarSelect(select, resultado.datos.map((c) => ({ id: c.id, texto: `${c.codigo_lre} · ${c.caja} – régimen ${c.regimen}` })), "Elige la ex-caja")
    }
}

document.getElementById("formTasaExCaja").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    const id = document.getElementById("tasaExCaja").value
    const resultado = await llamarApi(`/api/ex-cajas/${id}/tasas`, {
        method: "POST",
        body: JSON.stringify({
            desde: document.getElementById("tasaExDesde").value,
            tasa_prevision: document.getElementById("tasaExPrevision").value,
            tasa_desahucio: document.getElementById("tasaExDesahucio").value,
            fuente: document.getElementById("tasaExFuente").value
        })
    })
    if (resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo registrar la tasa")
        return
    }
    mensaje("info", "Tasa registrada.")
    this.reset()
    await cargarExCajas()
})

// ---------- Historial de cambios (solo soporte) ----------
const ACCIONES_HISTORIAL = { correccion: "Corrección", apertura_mes: "Apertura de mes" }

const tablaCambios = crearTabla({
    contenedor: "tablaCambios",
    textoBuscar: "Buscar por código, usuario o detalle…",
    vacio: "Todavía no hay cambios registrados.",
    columnas: [
        { titulo: "Fecha", valor: (c) => c.createdAt, html: (c) => escaparHtml(new Date(c.createdAt).toLocaleString("es-CL")) },
        { titulo: "Acción", valor: (c) => ACCIONES_HISTORIAL[c.accion] ?? c.accion },
        { titulo: "Código", valor: (c) => c.codigo },
        { titulo: "Rige desde", valor: (c) => c.vigencia_desde, html: (c) => escaparHtml(fechaCorta(c.vigencia_desde)) },
        { titulo: "Antes", valor: (c) => c.valor_anterior ?? "" },
        { titulo: "Después", valor: (c) => c.valor_nuevo ?? "" },
        { titulo: "Usuario", valor: (c) => c.usuario ? `${c.usuario.nombre} (${c.usuario.email})` : "—" },
        {
            titulo: "Oportunidad", valor: (c) => (c.tardio ? "Después del inicio" : "A tiempo"),
            html: (c) => c.tardio ? `<span class="insignia advertencia">Después del inicio</span>` : `<span class="insignia exito">A tiempo</span>`
        },
        { titulo: "Detalle", valor: (c) => c.detalle ?? "" }
    ]
})

async function cargarCambios() {
    const resultado = await llamarApi("/api/parametros-legales/cambios")
    if (resultado.status === 200) {
        tablaCambios.mostrar(resultado.datos)
    }
}

document.addEventListener("usuario-listo", function (evento) {
    esSoporte = evento.detail.rol_plataforma === "soporte"
    document.getElementById("panelSoporte").hidden = !esSoporte
    document.getElementById("panelCambios").hidden = !esSoporte
    document.getElementById("formTasaExCaja").hidden = !esSoporte
    if (esSoporte) {
        cargarCambios()
    }
    const hoy = new Date()
    campoMes.value = new URLSearchParams(location.search).get("mes")
        ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
    cargarMes()
})
