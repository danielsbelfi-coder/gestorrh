requiereLogin()

const campoMes = document.getElementById("mes")
let esSoporte = false
let parametros = []

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
        { titulo: "Nombre", valor: (p) => p.nombre ?? "" },
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
    tabla.mostrar(parametros)
    tablaTramos.mostrar(datos.tramos)

    const nombreMes = nombrePeriodo({ mes: Number(mesTexto().slice(5, 7)), anio: Number(mesTexto().slice(0, 4)) })
    document.getElementById("estadoMes").innerHTML = datos.faltantes.length === 0
        ? `<span class="insignia exito">Completo</span> ${escaparHtml(nombreMes)} tiene todos los parámetros que necesita el cálculo.`
        : `<span class="insignia peligro">Incompleto</span> A ${escaparHtml(nombreMes)} le faltan: <strong>${escaparHtml(datos.faltantes.join(", "))}</strong>. Sin ellos no se pueden calcular las liquidaciones de este mes.${esSoporte ? "" : " La plataforma los carga cada mes; si ya es tiempo de liquidar, escribe a soporte."}`
}

async function abrirMes(confirmar) {
    limpiarMensajes()
    if (confirmar && !confirm(`¿Abrir los parámetros de ${mesTexto()} copiando los del mes anterior?`)) {
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
            ${r.faltantes.length ? `<p class="nota peligro">Seguirán faltando: ${escaparHtml(r.faltantes.join(", "))}.</p>` : ""}
            ${r.simulado ? "" : `<p>Ahora corrige la UF (último día del mes) y la UTM con los valores oficiales.</p>`}
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
    if (esSoporte) {
        cargarCambios()
    }
    const hoy = new Date()
    campoMes.value = new URLSearchParams(location.search).get("mes")
        ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
    cargarMes()
})
