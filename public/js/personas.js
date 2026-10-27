requiereLogin()

const tabla = crearTabla({
    contenedor: "tablaPersonas",
    textoBuscar: "Buscar por nombre o RUT…",
    vacio: "Esta empresa todavía no tiene personas registradas.",
    columnas: [
        { titulo: "ID", valor: (p) => p.id, numero: true },
        { titulo: "RUT", valor: (p) => formatearRut(p.rut, p.dv) },
        {
            titulo: "Nombre", valor: (p) => nombreCompleto(p),
            html: (p) => `<a href="persona.html?id=${p.id}">${escaparHtml(nombreCompleto(p))}</a>`
        },
        { titulo: "Situación", valor: (p) => textoEstado("situacionPersona", p.situacion), html: (p) => insignia("situacionPersona", p.situacion) },
        { titulo: "", orden: false, valor: () => "", html: (p) => `<a class="boton secundario chico" href="persona.html?id=${p.id}">Ver ficha</a>` }
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

// La nómina descarga lo que se ve en la tabla (respeta búsqueda, filtro y orden).
document.getElementById("btnNomina").addEventListener("click", function () {
    descargarCsv(`nomina-personas-${hoyIso()}.csv`, [
        ["ID", (p) => p.id],
        ["RUT", (p) => formatearRut(p.rut, p.dv)],
        ["Nombres", (p) => p.nombres],
        ["Apellido paterno", (p) => p.apellido_paterno],
        ["Apellido materno", (p) => p.apellido_materno],
        ["Situación", (p) => textoEstado("situacionPersona", p.situacion)]
    ], tabla.visibles())
})

document.addEventListener("empresa-lista", cargarPersonas)
