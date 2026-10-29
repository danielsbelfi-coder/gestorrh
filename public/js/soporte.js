requiereLogin()

ESTADOS.cuenta_soporte = { activa: ["Activa", "exito"], suspendida: ["Suspendida", "advertencia"], cancelada: ["Cancelada", "peligro"] }

const tablaCuentas = crearTabla({
    contenedor: "tablaCuentas",
    textoBuscar: "Buscar cuenta o administrador…",
    vacio: "No hay cuentas.",
    columnas: [
        { titulo: "Cuenta", valor: (c) => c.nombre },
        { titulo: "Estado", valor: (c) => textoEstado("cuenta_soporte", c.estado), html: (c) => insignia("cuenta_soporte", c.estado) },
        { titulo: "Administrador principal", valor: (c) => c.principal ? `${c.principal.nombre} ${c.principal.email}` : "", html: (c) => c.principal ? `${escaparHtml(c.principal.nombre)}<div class="texto-suave">${escaparHtml(c.principal.email)}</div>` : `<span class="texto-suave">Sin administrador principal</span>` },
        {
            titulo: "", orden: false, valor: () => "",
            html: (c) => c.principal ? `<button type="button" class="chico secundario" data-restablecer="${c.id}">Restablecer contraseña del principal</button>` : ""
        }
    ]
})

function dibujarAccesos(accesos) {
    const contenedor = document.getElementById("accesosVigentes")
    if (accesos.length === 0) {
        contenedor.innerHTML = `<p class="texto-suave">Sin acceso a empresas cliente: el cliente debe autorizarlo.</p>`
        return
    }
    contenedor.innerHTML = `<ul>${accesos.map((a) => `<li><strong>${escaparHtml(a.razon_social)}</strong> hasta las ${escaparHtml(new Date(a.hasta).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }))}</li>`).join("")}</ul>`
}

async function cargar() {
    const [usuario, cuentas] = await Promise.all([llamarApi("/api/auth/usuario"), llamarApi("/api/soporte/cuentas")])
    dibujarAccesos(usuario.datos?.accesos_soporte ?? [])
    if (cuentas.status !== 200) {
        mensaje("error", cuentas.datos?.error ?? "No se pudieron cargar las cuentas")
        return
    }
    tablaCuentas.mostrar(cuentas.datos)
}

document.getElementById("tablaCuentas").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-restablecer]")
    if (!boton) {
        return
    }
    const motivo = prompt("Restablecer la contraseña del administrador principal de esta cuenta.\n\nEl motivo queda registrado y el cliente lo verá (entre 10 y 500 caracteres):")
    if (motivo === null) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/soporte/cuentas/${boton.dataset.restablecer}/restablecer-principal`, {
        method: "PATCH",
        body: JSON.stringify({ motivo: motivo.trim() })
    })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo restablecer la contraseña")
        return
    }
    mostrarCredencial({
        titulo: `Contraseña inicial de ${resultado.datos.usuario.nombre}`,
        email: resultado.datos.usuario.email,
        password: resultado.datos.passwordInicial,
        destinatario: `a ${resultado.datos.usuario.nombre}`
    })
})

cargar()
