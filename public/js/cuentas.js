requiereLogin()

const mensaje = document.getElementById("mensaje")

let cuentas = []

function botonesCuenta(cuenta) {
    if (cuenta.fecha_eliminacion_datos) {
        return `<button data-accion="consumo" data-id="${cuenta.id}">Ver consumo</button>`
    }

    const botones = []

    if (cuenta.estado === "activa") {
        botones.push(`<button data-accion="suspender" data-id="${cuenta.id}">Suspender</button>`)
    } else {
        botones.push(`<button data-accion="reactivar" data-id="${cuenta.id}">Reactivar</button>`)
    }

    if (cuenta.estado !== "cancelada") {
        botones.push(`<button data-accion="cancelar" data-id="${cuenta.id}">Cancelar</button>`)
    }

    botones.push(`<button data-accion="consumo" data-id="${cuenta.id}">Ver consumo</button>`)

    return botones.join(" ")
}

function textoEstadoCuenta(cuenta) {
    if (cuenta.fecha_eliminacion_datos) {
        return `cancelada, datos eliminados el ${formatearFecha(cuenta.fecha_eliminacion_datos)}`
    }

    if (cuenta.fecha_eliminacion) {
        return `cancelada, se eliminará el ${formatearFecha(cuenta.fecha_eliminacion)}`
    }

    return cuenta.estado
}

async function cargarCuentas() {
    const resultado = await llamarApi("/api/cuentas")

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    cuentas = resultado.datos

    document.getElementById("cuerpoCuentas").innerHTML = cuentas.map((cuenta) => `<tr>
        <td>${escaparHtml(cuenta.nombre)}</td>
        <td>${escaparHtml(cuenta.rut_titular)}-${escaparHtml(cuenta.dv_titular)}</td>
        <td>${escaparHtml(cuenta.email_contacto ?? "")}</td>
        <td>${escaparHtml(textoEstadoCuenta(cuenta))}</td>
        <td>${cuenta.Plan ? escaparHtml(cuenta.Plan.nombre) : "Sin plan"}</td>
        <td>${escaparHtml(cuenta.usuarios_adicionales)}</td>
        <td>${botonesCuenta(cuenta)}</td>
    </tr>`).join("")

    const selectCuenta = document.getElementById("planCuenta")
    const seleccionada = selectCuenta.value

    selectCuenta.innerHTML = cuentas
        .filter((cuenta) => !cuenta.fecha_eliminacion_datos)
        .map((cuenta) => `<option value="${cuenta.id}">${escaparHtml(cuenta.nombre)}</option>`
        ).join("")

    if (seleccionada) {
        selectCuenta.value = seleccionada
    }

    rellenarFormPlan()
}

async function cargarPlanes() {
    const resultado = await llamarApi("/api/planes")

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    const opciones = resultado.datos
        .filter((plan) => plan.activo)
        .map((plan) => `<option value="${plan.id}">${escaparHtml(plan.nombre)} (${escaparHtml(plan.max_trabajadores)} trabajadores, ${escaparHtml(plan.usuarios_incluidos)} usuarios)</option>`)
        .join("")

    document.getElementById("crearPlan").innerHTML = opciones
    document.getElementById("planNuevo").innerHTML = opciones
}

function rellenarFormPlan() {
    const id = Number(document.getElementById("planCuenta").value)
    const cuenta = cuentas.find((c) => c.id === id)

    if (!cuenta) {
        return
    }

    if (cuenta.plan_id !== null) {
        document.getElementById("planNuevo").value = cuenta.plan_id
    }

    document.getElementById("planAdicionales").value = cuenta.usuarios_adicionales
}

function mostrarPasswordAdmin(datos) {
    mensaje.textContent = `Cuenta creada. Contraseña inicial del administrador ${datos.admin.email}: ${datos.passwordInicial}. Entrégala al cliente: no se volverá a mostrar y deberá cambiarla al entrar.`
}

const formCrearCuenta = document.getElementById("formCrearCuenta")

formCrearCuenta.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    mensaje.textContent = ""

    const datos = {
        nombre: document.getElementById("nombre").value,
        rut_titular: document.getElementById("rutTitular").value,
        dv_titular: document.getElementById("dvTitular").value,
        razon_social_titular: document.getElementById("razonSocialTitular").value,
        email_contacto: document.getElementById("emailContacto").value,
        admin_nombre: document.getElementById("adminNombre").value,
        admin_email: document.getElementById("adminEmail").value,
        plan_id: Number(document.getElementById("crearPlan").value),
        usuarios_adicionales: Number(document.getElementById("crearAdicionales").value)
    }

    const resultado = await llamarApi("/api/cuentas", {
        method: "POST",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 201) {
        mensaje.textContent = resultado.datos.error
        return
    }

    mostrarPasswordAdmin(resultado.datos)
    formCrearCuenta.reset()
    cargarCuentas()
})

function textoUso(uso) {
    return uso.limite === null ? `${uso.usados} (sin plan)` : `${uso.usados} de ${uso.limite}`
}

document.getElementById("cuerpoCuentas").addEventListener("click", async function (evento) {
    const accion = evento.target.dataset.accion
    const id = evento.target.dataset.id

    if (!accion) {
        return
    }

    mensaje.textContent = ""
    let resultado

    if (accion === "consumo") {
        resultado = await llamarApi(`/api/cuentas/${id}/consumo`)

        if (resultado.status !== 200) {
            mensaje.textContent = resultado.datos.error
            return
        }

        const cuenta = cuentas.find((c) => c.id === Number(id))
        const consumo = resultado.datos

        mensaje.textContent = `${cuenta.nombre}, ${consumo.periodo.mes}/${consumo.periodo.anio}: trabajadores ${textoUso(consumo.trabajadores)}; usuarios activos ${textoUso(consumo.usuarios)}.`
        return
    }

    if (accion === "suspender") {
        if (!confirm("¿Suspender esta cuenta? Sus usuarios podrán entrar, pero no podrán hacer cambios hasta que se reactive.")) {
            return
        }

        resultado = await llamarApi(`/api/cuentas/${id}/suspender`, { method: "PATCH" })
    } else if (accion === "cancelar") {
        resultado = await llamarApi(`/api/cuentas/${id}/cancelar`, { method: "PATCH" })

        if (resultado.status === 400) {
            if (!confirm(resultado.datos.error)) {
                return
            }

            resultado = await llamarApi(`/api/cuentas/${id}/cancelar`, {
                method: "PATCH",
                body: JSON.stringify({ confirmar: true })
            })
        }
    } else if (accion === "reactivar") {
        resultado = await llamarApi(`/api/cuentas/${id}/reactivar`, { method: "PATCH" })
    }

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    cargarCuentas()
})

document.getElementById("planCuenta").addEventListener("change", rellenarFormPlan)

document.getElementById("formPlan").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    mensaje.textContent = ""

    const id = document.getElementById("planCuenta").value

    const datos = {
        plan_id: Number(document.getElementById("planNuevo").value),
        usuarios_adicionales: Number(document.getElementById("planAdicionales").value)
    }

    const resultado = await llamarApi(`/api/cuentas/${id}/plan`, {
        method: "PATCH",
        body: JSON.stringify(datos)
    })

    if (resultado.status !== 200) {
        mensaje.textContent = resultado.datos.error
        return
    }

    mensaje.textContent = "Plan actualizado"
    cargarCuentas()
})

async function iniciar() {
    await cargarPlanes()
    await cargarCuentas()
}

document.addEventListener("DOMContentLoaded", iniciar)