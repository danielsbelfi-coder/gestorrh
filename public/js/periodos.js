requiereLogin()

const tabla = crearTabla({
    contenedor: "tablaPeriodos",
    textoBuscar: "Buscar periodo (ej. agosto 2027)…",
    vacio: "Esta empresa todavía no tiene periodos.",
    columnas: [
        { titulo: "Periodo", valor: (p) => nombrePeriodo(p) },
        { titulo: "Apertura", valor: (p) => p.fecha_apertura ?? "", html: (p) => escaparHtml(fechaCorta(p.fecha_apertura)) },
        { titulo: "Cierre", valor: (p) => p.fecha_cierre ?? "", html: (p) => escaparHtml(fechaCorta(p.fecha_cierre)) },
        { titulo: "Estado", valor: (p) => textoEstado("periodo", p.estado), html: (p) => insignia("periodo", p.estado) },
        {
            titulo: "", orden: false, valor: () => "",
            html: (p) => p.estado === "abierto"
                ? `<a class="boton secundario chico" href="liquidaciones.html?periodo=${p.id}">Liquidaciones</a>
                   <button type="button" class="chico" data-cerrar="${p.id}">Cerrar periodo</button>`
                : ""
        }
    ],
    filtros: [{ titulo: "Estado", valor: (p) => p.estado, opciones: opcionesDe("periodo"), inicial: "abierto" }]
})

async function cargarPeriodos() {
    const listas = await cargarListas(["/api/periodos-remuneracion"])
    if (!listas) {
        return
    }
    // Del más reciente al más antiguo.
    tabla.mostrar(deEmpresaActual(listas[0]).sort((a, b) => b.anio - a.anio || b.mes - a.mes))
}

llenarSelect(document.getElementById("mes"), NOMBRES_MES.map((nombre, i) => ({ id: i + 1, texto: nombre })))
const hoy = new Date()
document.getElementById("mes").value = hoy.getMonth() + 1
document.getElementById("anio").value = hoy.getFullYear()

const formulario = document.getElementById("formCrearPeriodos")

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    if (exigirEmpresaActual() === null) {
        return
    }

    const creado = await crearRegistro("/api/periodos-remuneracion", {
        empresa_id: empresaActual(),
        mes: Number(document.getElementById("mes").value),
        anio: Number(document.getElementById("anio").value),
        fecha_apertura: document.getElementById("fechaApertura").value
    }, "Periodo abierto.")

    if (creado) {
        if (creado.advertencias?.length) {
            mensaje("error", creado.advertencias.join(" "))
        }
        document.getElementById("panelCrear").removeAttribute("open")
        cargarPeriodos()
    }
})

document.getElementById("tablaPeriodos").addEventListener("click", async function (evento) {
    const id = evento.target.closest("[data-cerrar]")?.dataset.cerrar
    if (!id) {
        return
    }

    if (!confirm("¿Cerrar este periodo? Esta acción no se puede deshacer.")) {
        return
    }

    limpiarMensajes()
    const resultado = await llamarApi(`/api/periodos-remuneracion/${id}/cerrar`, { method: "PATCH" })

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cerrar el periodo")
        if (resultado.datos?.problemas) {
            mostrarProblemas("listaProblemas", resultado.datos.problemas)
        }
        return
    }

    mensaje("info", "Periodo cerrado.")
    cargarPeriodos()
})

document.addEventListener("empresa-lista", cargarPeriodos)
