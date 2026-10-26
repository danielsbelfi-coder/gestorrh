requiereLogin()

function mostrarError(texto) {
    document.getElementById("mensajeError").textContent = texto
}

function mostrarInfo(texto) {
    document.getElementById("mensajeInfo").textContent = texto
}

function mostrarProblemas(problemas) {
    document.getElementById("listaProblemas").innerHTML = problemas.map(function (problema) {
        const motivos = problema.motivos ?? [problema.motivo]
        return `<li>Trabajador ${problema.trabajador_id}: ${escaparHtml(motivos.join("; "))}</li>`
    }).join("")
}

function limpiarMensajes() {
    mostrarError("")
    mostrarInfo("")
    mostrarProblemas([])
}

function botonesLiquidacion(liquidacion) {
    const id = liquidacion.id
    const principal = liquidacion.estado === "calculada"
        ? `<button data-accion="emitir" data-id="${id}">Emitir</button>`
        : `<button data-accion="recalcular" data-id="${id}">Recalcular</button>`

    return `${principal}
        <button data-accion="pdf" data-id="${id}">PDF</button>
        <button data-accion="pdf-aportes" data-id="${id}">PDF con aportes</button>`
}

function formatearPesos(valor) {
    return "$" + Math.round(Number(valor)).toLocaleString("es-CL")
}

async function cargarSelectorPeriodos() {
    const resultado = await llamarApi("/api/periodos-remuneracion")

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const selector = document.getElementById("periodo")
    selector.innerHTML = resultado.datos.map(function (periodo) {
        return `<option value="${periodo.id}">${periodo.mes}/${periodo.anio}</option>`
    }).join("")

    cargarLiquidaciones()
}

async function cargarLiquidaciones() {
    const periodoId = document.getElementById("periodo").value

    const resultado = await llamarApi(`/api/periodos-remuneracion/${periodoId}/liquidaciones`)

    if (resultado.status !== 200) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }


    const lista = document.getElementById("listaLiquidaciones")
    lista.innerHTML = resultado.datos.map(function (liquidacion) {
        return `<li>
                    <details>
                        <summary>Trabajador ${liquidacion.trabajador_id} - versión ${liquidacion.version} - ${liquidacion.estado} - Líquido: ${formatearPesos(liquidacion.liquido_a_pagar)}</summary>
                        <p>Sueldo proporcional: ${formatearPesos(liquidacion.sueldo_base_proporcional)}</p>
                        <p>Monto horas extras: ${formatearPesos(liquidacion.monto_horas_extra)}</p>
                        <p>Monto gratificación: ${formatearPesos(liquidacion.monto_gratificacion)}</p>
                        <p>Total Haberes: ${formatearPesos(liquidacion.total_haberes)}</p>
                        <p>Descuento AFP: ${formatearPesos(liquidacion.descuento_afp)}</p>
                        <p>Descuento salud: ${formatearPesos(liquidacion.descuento_salud)}</p>
                        <p>Descuento cesantía: ${formatearPesos(liquidacion.descuento_cesantia)}</p>
                        <p>Monto impuesto unico: ${formatearPesos(liquidacion.monto_impuesto_unico)}</p>
                        <p>Liquido a pagar: ${formatearPesos(liquidacion.liquido_a_pagar)}</p>
                    </details>
                    ${botonesLiquidacion(liquidacion)}
                </li>`
    }).join("")
}

document.getElementById("formCalcular").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    document.getElementById("mensajeError").textContent = ""
    document.getElementById("mensajeInfo").textContent = ""

    const periodoId = document.getElementById("periodo").value
    const trabajadorId = document.getElementById("trabajadorId").value

    const resultado = await llamarApi(
        `/api/periodos-remuneracion/${periodoId}/liquidaciones`,
        {
            method: "POST",
            body: JSON.stringify({ trabajador_id: trabajadorId })
        }
    )

    if (resultado.status !== 200 && resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    const advertencias = resultado.datos.advertencias
    const mensaje = resultado.status === 201 ? "Liquidación calculada." : "Borrador recalculado."
    document.getElementById("mensajeInfo").textContent = [mensaje, ...advertencias].join(" ")

    document.getElementById("formCalcular").reset()
    cargarLiquidaciones()
})

document.getElementById("listaLiquidaciones").addEventListener("click", async function (evento) {
    const { accion, id } = evento.target.dataset

    if (!accion) {
        return
    }

    limpiarMensajes()
    const periodoId = document.getElementById("periodo").value
    const base = `/api/periodos-remuneracion/${periodoId}/liquidaciones/${id}`

    if (accion === "pdf" || accion === "pdf-aportes") {
        const resultado = await descargarArchivo(`${base}/documento${accion === "pdf-aportes" ? "?con_aportes=1" : ""}`)
        if (resultado.status !== 200) {
            mostrarError(resultado.datos.error)
        }
        return
    }

    if (accion === "emitir") {
        if (!confirm("¿Emitir esta liquidación? Después solo se podrá modificar con un recálculo.")) {
            return
        }
        const resultado = await llamarApi(`${base}/emitir`, { method: "POST" })
        if (resultado.status !== 200) {
            mostrarError(resultado.datos.error)
            return
        }
        mostrarInfo("Liquidación emitida.")
    }

    if (accion === "recalcular") {
        const motivo = prompt("Motivo del recálculo:")
        if (motivo === null) {
            return
        }
        const resultado = await llamarApi(`${base}/recalcular`, { method: "POST", body: JSON.stringify({ motivo }) })
        if (resultado.status !== 201) {
            mostrarError(resultado.datos.error)
            return
        }
        mostrarInfo(["Nueva versión creada en borrador.", ...resultado.datos.advertencias].join(" "))
    }

    cargarLiquidaciones()
})

document.getElementById("btnEmitirTodas").addEventListener("click", async function () {
    limpiarMensajes()

    if (!confirm("¿Emitir todas las liquidaciones calculadas del periodo? Si alguna tiene pendientes, no se emitirá ninguna.")) {
        return
    }

    const periodoId = document.getElementById("periodo").value
    const resultado = await llamarApi(`/api/periodos-remuneracion/${periodoId}/liquidaciones/emitir`, { method: "POST" })

    if (resultado.status === 409 && resultado.datos.problemas) {
        mostrarError("No se emitió ninguna liquidación. Resuelva estos pendientes:")
        mostrarProblemas(resultado.datos.problemas)
        return
    }

    if (resultado.status !== 200) {
        mostrarError(resultado.datos.error)
        return
    }

    mostrarInfo(`Se emitieron ${resultado.datos.emitidas} liquidación(es).`)
    cargarLiquidaciones()
})

async function descargarTodas(conAportes) {
    limpiarMensajes()
    const periodoId = document.getElementById("periodo").value
    const resultado = await descargarArchivo(`/api/periodos-remuneracion/${periodoId}/liquidaciones/documento${conAportes ? "?con_aportes=1" : ""}`)

    if (resultado.status !== 200) {
        mostrarError(resultado.datos.error)
    }
}

document.getElementById("btnPdfTodas").addEventListener("click", () => descargarTodas(false))
document.getElementById("btnPdfTodasAportes").addEventListener("click", () => descargarTodas(true))

document.addEventListener("DOMContentLoaded", cargarSelectorPeriodos)
document.getElementById("periodo").addEventListener("change", cargarLiquidaciones)