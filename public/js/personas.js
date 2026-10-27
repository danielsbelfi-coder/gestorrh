requiereLogin()

const tabla = crearTabla({
    contenedor: "tablaPersonas",
    textoBuscar: "Buscar por nombre o RUT…",
    vacio: "Esta empresa todavía no tiene personas registradas.",
    columnas: [
        { titulo: "ID", valor: (p) => p.id, numero: true },
        { titulo: "RUT", valor: (p) => formatearRut(p.rut, p.dv) },
        { titulo: "Nombre", valor: (p) => nombreCompleto(p) },
        { titulo: "Situación", valor: (p) => textoEstado("situacionPersona", p.situacion), html: (p) => insignia("situacionPersona", p.situacion) }
    ],
    filtros: [{ titulo: "Situación", valor: (p) => p.situacion, opciones: opcionesDe("situacionPersona") }]
})

async function cargarPersonas() {
    const listas = await cargarListas(["/api/personas", "/api/trabajadores"])
    if (!listas) {
        return
    }
    const [personas, trabajadores] = listas
    const trabajadoresEmpresa = deEmpresaActual(trabajadores)

    tabla.mostrar(deEmpresaActual(personas).map((persona) => ({
        ...persona,
        situacion: situacionPersona(trabajadoresEmpresa.filter((t) => t.persona_id === persona.id))
    })))
}

const formulario = document.getElementById("formCrearPersona")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    if (exigirEmpresaActual() === null) {
        return
    }

    const creada = await crearRegistro("/api/personas", {
        empresa_id: empresaActual(),
        rut: document.getElementById("rut").value.replace(/\D/g, ""),
        dv: document.getElementById("dv").value.trim().toUpperCase(),
        nombres: document.getElementById("nombres").value.trim(),
        apellido_paterno: document.getElementById("apellidoPaterno").value.trim(),
        nacionalidad: document.getElementById("nacionalidad").value,
        fecha_nacimiento: document.getElementById("fechaNacimiento").value,
        direccion: document.getElementById("direccion").value.trim()
    }, "Persona creada.")

    if (creada) {
        cerrarPanelCrear(formulario)
        cargarPersonas()
    }
})

document.addEventListener("empresa-lista", cargarPersonas)
