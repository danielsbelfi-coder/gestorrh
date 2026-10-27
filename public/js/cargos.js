requiereLogin()

const tabla = crearTabla({
    contenedor: "tablaCargos",
    textoBuscar: "Buscar cargo…",
    vacio: "Esta empresa todavía no tiene cargos.",
    columnas: [
        { titulo: "ID", valor: (c) => c.id, numero: true },
        { titulo: "Nombre", valor: (c) => c.nombre },
        { titulo: "Descripción", valor: (c) => c.descripcion ?? "" },
        { titulo: "Trabajadores", valor: (c) => c.trabajadores, numero: true }
    ]
})

async function cargarCargos() {
    const listas = await cargarListas(["/api/cargos", "/api/contratos"])
    if (!listas) {
        return
    }
    const [cargos, contratos] = listas
    const vigentes = deEmpresaActual(contratos, (c) => c.Trabajador?.empresa_id).filter((c) => c.estado === "vigente")

    tabla.mostrar(deEmpresaActual(cargos).map((cargo) => ({
        ...cargo,
        trabajadores: new Set(vigentes.filter((c) => c.cargo_id === cargo.id).map((c) => c.trabajador_id)).size
    })))
}

const formulario = document.getElementById("formCrearCargo")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    if (exigirEmpresaActual() === null) {
        return
    }

    const departamento = document.getElementById("departamentoId").value.trim()
    const descripcion = document.getElementById("descripcion").value.trim()

    const creado = await crearRegistro("/api/cargos", {
        empresa_id: empresaActual(),
        nombre: document.getElementById("nombre").value.trim(),
        departamento_id: departamento === "" ? null : departamento,
        descripcion: descripcion === "" ? null : descripcion
    }, "Cargo creado.")

    if (creado) {
        cerrarPanelCrear(formulario)
        cargarCargos()
    }
})

document.addEventListener("empresa-lista", cargarCargos)
