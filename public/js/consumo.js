requiereLogin()

const mensaje = document.getElementById("mensaje")
const aviso = document.getElementById("aviso")

function filaConsumo(concepto, uso) {
    const limite = uso.limite === null ? "—" : escaparHtml(uso.limite)

    return `<tr>
        <td>${concepto}</td>
        <td>${escaparHtml(uso.usados)}</td>
        <td>${limite}</td>
    </tr>`
}

function textoAviso(consumo) {
    if (consumo.plan === null) {
        return "La cuenta no tiene un plan asignado. Contacta a tu ejecutivo comercial."
    }

    const avisos = []

    if (consumo.trabajadores.usados >= consumo.trabajadores.limite) {
        avisos.push("Alcanzaste el límite de trabajadores del plan para este mes.")
    }

    if (consumo.usuarios.usados >= consumo.usuarios.limite) {
        avisos.push("Alcanzaste el límite de usuarios del plan.")
    }

    if (avisos.length > 0) {
        avisos.push("Para ampliarlo, contacta a tu ejecutivo comercial.")
    }

    return avisos.join(" ")
}

async function cargarConsumo(anio, mes) {
    mensaje.textContent = ""
    aviso.textContent = ""

    const resultado = await llamarApi(`/api/cuenta/consumo?anio=${anio}&mes=${mes}`)

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    const consumo = resultado.datos

    document.getElementById("nombrePlan").textContent = consumo.plan ?? "Sin plan asignado"

    document.getElementById("cuerpoConsumo").innerHTML =
        filaConsumo("Trabajadores del mes", consumo.trabajadores) +
        filaConsumo("Usuarios activos (a la fecha)", consumo.usuarios)

    aviso.textContent = textoAviso(consumo)
}

document.getElementById("formPeriodo").addEventListener("submit", function (evento) {
    evento.preventDefault()

    const anio = document.getElementById("anio").value
    const mes = document.getElementById("mes").value

    cargarConsumo(anio, mes)
})

const hoy = new Date()
document.getElementById("mes").value = hoy.getMonth() + 1
document.getElementById("anio").value = hoy.getFullYear()

cargarConsumo(hoy.getFullYear(), hoy.getMonth() + 1)