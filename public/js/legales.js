requiereLogin()

let nombrePorTrabajador = new Map()
const selectorPeriodo = document.getElementById("periodo")

async function cargarNombres() {
    const listas = await cargarListas(["/api/trabajadores", "/api/personas"])
    if (!listas) {
        return
    }
    const personaPorId = porId(listas[1])
    nombrePorTrabajador = new Map(deEmpresaActual(listas[0]).map((t) =>
        [t.id, nombreCompleto(personaPorId.get(t.persona_id)) || `Trabajador ${t.id}`]))
}

// Descarga un archivo legal y muestra los problemas (409) o las advertencias del backend.
async function descargarLegal(ruta, textoExito) {
    limpiarMensajes()
    if (!selectorPeriodo.value) {
        mensaje("error", "Esta empresa no tiene periodos.")
        return
    }

    const resultado = await descargarArchivo(`/api/periodos-remuneracion/${selectorPeriodo.value}/${ruta}`)

    if (resultado.status === 409 && resultado.datos?.problemas) {
        mensaje("error", resultado.datos.error)
        mostrarProblemasConNombre(resultado.datos.problemas.map((p) => ({
            nombre: nombrePorTrabajador.get(p.trabajador_id) ?? `Trabajador ${p.trabajador_id}`,
            motivos: p.motivos ?? [p.motivo]
        })))
        return
    }

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo generar el archivo")
        return
    }

    mensaje("info", [textoExito, ...(resultado.advertencias ?? [])].join(" "))
}

// ---------- DJ 1887 ----------
const selectorAnio = document.getElementById("anioDj")
const panelDj = document.getElementById("panelDj")
const MESES_CORTOS_DJ = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
let tablaDj = null

function consultaDj() {
    return `empresa_id=${empresaActual()}&anio=${selectorAnio.value}`
}

function llenarAnios(periodos) {
    const anios = [...new Set(periodos.map((p) => p.anio))].sort((a, b) => b - a)
    selectorAnio.innerHTML = anios.map((anio) => `<option value="${anio}">${anio}</option>`).join("")
    // Por defecto, el último año ya terminado (la DJ se presenta en marzo del año siguiente).
    const terminado = anios.find((anio) => anio < new Date().getFullYear())
    if (terminado) {
        selectorAnio.value = terminado
    }
}

function cuadro(titulo, filas, nota = "") {
    return `<section class="tarjeta"><h3>${escaparHtml(titulo)}</h3>
        <table><tbody>${filas.map(([texto, monto]) => `<tr><td>${escaparHtml(texto)}</td><td class="numero">${escaparHtml(typeof monto === "number" ? pesos(monto) : monto)}</td></tr>`).join("")}</tbody></table>
        ${nota ? `<p class="texto-suave">${escaparHtml(nota)}</p>` : ""}</section>`
}

function mostrarDj(datos) {
    const { resumen, filas } = datos
    const a = resumen.actualizados
    const s = resumen.sinActualizar
    document.getElementById("tituloDj").textContent = `DJ 1887 del año comercial ${datos.anio}`
    document.getElementById("cuadrosDj").innerHTML = [
        cuadro("Sección C: totales actualizados", [
            ["Casos informados", String(resumen.casos)],
            ["Renta total neta pagada", a.rentaNeta],
            ["Impuesto único retenido", a.impuesto],
            ["Mayor retención solicitada", a.mayorRetencion],
            ["Renta total no gravada", a.noGravada],
            ["Renta total exenta", a.exenta],
            ["Rebaja por zonas extremas", a.zonas],
            ["3 % préstamo tasa 0 %", a.prestamo]
        ]),
        cuadro("Montos anuales sin actualizar", [
            ["Renta total neta pagada", s.rentaNeta],
            ["Impuesto retenido (rentas pagadas en el año)", s.impuesto],
            ["Impuesto de rentas devengadas pagadas ene–abr", s.impuestoAbril],
            ["Renta total no gravada", s.noGravada],
            ["Renta total exenta", s.exenta],
            ["Rebaja por zonas extremas", s.zonas],
            ["Leyes sociales", s.leyesSociales],
            ["3 % préstamo tasa 0 %", s.prestamo],
            ["Remuneraciones imponibles (actualizadas)", resumen.imponiblesActualizadas]
        ], "Estos montos se escriben en el formulario del SII antes de importar el archivo."),
        cuadro("Sección A", [["Año en que se acoge a las 40 horas", "se responde en el formulario"]],
            "La identificación del declarante también se completa en el formulario del SII.")
    ].join("")

    tablaDj ??= crearTabla({
        contenedor: "tablaDj",
        textoBuscar: "Buscar por nombre o RUT…",
        columnas: [
            { titulo: "N°", valor: (f) => f.certificado, numero: true },
            { titulo: "Trabajador", valor: (f) => `${f.nombre} ${formatearRut(f.rut, f.dv)}`, html: (f) => `${escaparHtml(f.nombre)}<br><span class="texto-suave">${escaparHtml(formatearRut(f.rut, f.dv))}</span>` },
            { titulo: "Meses", valor: (f) => f.codigos.join(""), html: (f) => `<code>${f.codigos.map((c, i) => c ? `${MESES_CORTOS_DJ[i]} ${c}` : "").filter(Boolean).map(escaparHtml).join(" · ")}</code>` },
            { titulo: "Renta neta", valor: (f) => f.anual.rentaNeta, html: (f) => escaparHtml(pesos(f.anual.rentaNeta)), numero: true },
            { titulo: "Impuesto", valor: (f) => f.anual.impuesto, html: (f) => escaparHtml(pesos(f.anual.impuesto)), numero: true },
            { titulo: "No gravada", valor: (f) => f.anual.noGravada, html: (f) => escaparHtml(pesos(f.anual.noGravada)), numero: true },
            { titulo: "Horas", valor: (f) => f.horas, numero: true },
            { titulo: "", orden: false, valor: () => "", html: (f) => `<button type="button" class="secundario chico" data-certificado="${f.persona_id}">Certificado</button>` }
        ],
        vacio: "No hay trabajadores con rentas en el año."
    })
    tablaDj.mostrar(filas)
    panelDj.hidden = false
}

async function verResumenDj() {
    limpiarMensajes()
    panelDj.hidden = true
    if (!selectorAnio.value) {
        mensaje("error", "Esta empresa no tiene periodos.")
        return
    }
    const resultado = await llamarApi(`/api/dj1887?${consultaDj()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo generar la DJ")
        return
    }
    mostrarDj(resultado.datos)
    if (resultado.datos.avisos.length > 0) {
        mensaje("info", resultado.datos.avisos.join(" "))
    }
}

async function descargarDj(ruta, textoExito) {
    limpiarMensajes()
    if (!selectorAnio.value) {
        mensaje("error", "Esta empresa no tiene periodos.")
        return
    }
    const resultado = await descargarArchivo(`/api/dj1887/${ruta}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo generar el archivo")
        return
    }
    mensaje("info", [textoExito, ...(resultado.advertencias ?? [])].join(" "))
}

document.getElementById("btnResumenDj").addEventListener("click", verResumenDj)
document.getElementById("btnArchivoDj").addEventListener("click", () =>
    descargarDj(`archivo?${consultaDj()}`, "Archivo de la DJ 1887 generado. Súbelo en el Importador de Datos del SII después de completar el formulario con los totales del resumen."))
document.getElementById("btnCertificados").addEventListener("click", () => descargarDj(`certificados?${consultaDj()}`, "Certificados generados."))
document.getElementById("tablaDj").addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-certificado]")
    if (boton) {
        descargarDj(`certificados?${consultaDj()}&persona_id=${boton.dataset.certificado}`, "Certificado generado.")
    }
})
selectorAnio.addEventListener("change", () => { limpiarMensajes(); panelDj.hidden = true })

document.getElementById("btnPrevired").addEventListener("click", () => descargarLegal("previred", "Archivo Previred generado."))
document.getElementById("btnLre").addEventListener("click", () => descargarLegal("lre", "Archivo LRE generado."))
selectorPeriodo.addEventListener("change", limpiarMensajes)

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    await cargarNombres()
    llenarAnios(await llenarSelectorPeriodos(selectorPeriodo))
    panelDj.hidden = true
})
