requiereLogin()

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
                        <summary>Trabajador ${liquidacion.trabajador_id} - Líquido: ${formatearPesos(liquidacion.liquido_a_pagar)} - ${liquidacion.estado}</summary>
                        <p>Sueldo proporcional: ${formatearPesos(liquidacion.sueldo_base_proporcional)}</p>
                        <p>Monto horas extras: ${formatearPesos(liquidacion.monto_horas_extra)}</p>
                        <p>Monto gratificación: ${formatearPesos(liquidacion.monto_gratificacion)}</p>
                        <p>Total Haberes: ${formatearPesos(liquidacion.total_haberes)}</p>
                        <p>Descuento AFP: ${formatearPesos(liquidacion.descuento_afp)}</p>
                        <p>Descuento salud: ${formatearPesos(liquidacion.descuento_salud)}</p>
                        <p>Monto impuesto unico: ${formatearPesos(liquidacion.monto_impuesto_unico)}</p>
                        <p>Liquido a pagar: ${formatearPesos(liquidacion.liquido_a_pagar)}</p>
                    </details>
                </li>`
    }).join("")
}

document.getElementById("formCalcular").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    document.getElementById("mensajeError").textContent = ""

    const periodoId = document.getElementById("periodo").value
    const trabajadorId = document.getElementById("trabajadorId").value

    const resultado = await llamarApi(
        `/api/periodos-remuneracion/${periodoId}/liquidaciones`,
        {
            method: "POST",
            body: JSON.stringify({ trabajador_id: trabajadorId })
        }
    )

    if (resultado.status !== 201) {
        document.getElementById("mensajeError").textContent = resultado.datos.error
        return
    }

    document.getElementById("formCalcular").reset()
    cargarLiquidaciones()
})

document.addEventListener("DOMContentLoaded", cargarSelectorPeriodos)
document.getElementById("periodo").addEventListener("change", cargarLiquidaciones)