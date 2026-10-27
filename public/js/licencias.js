requiereLogin()

// Entidades pagadoras de subsidio (copia de src/asistencia/pagadores_subsidio.js).
const PAGADORES = [
    ["96572800-7", "Banmédica"], ["96856780-2", "Consalud"], ["96502530-8", "Vida Tres"], ["76296619-0", "Colmena"],
    ["96501450-0", "Cruz Blanca"], ["96936100-0", "Esencial"], ["61603000-0", "Fonasa"], ["96504160-5", "Nueva Masvida"],
    ["76334370-7", "Isalud"], ["71235700-2", "Fundación"], ["79906120-1", "Cruz del Norte"],
    ["70360100-6", "Asociación Chilena de Seguridad (ACHS)"], ["70285100-9", "Mutual de Seguridad CChC"],
    ["70015580-3", "Instituto de Seguridad del Trabajo (IST)"], ["61533000-0", "Instituto de Seguridad Laboral (ISL)"]
]
const NOMBRE_PAGADOR = Object.fromEntries(PAGADORES)
const TIPOS = { comun: "Común", maternal: "Maternal", accidente_trabajo: "Accidente del trabajo" }

let datosTrabajadores = { trabajadores: [], porId: new Map() }
let licencias = []

function diasDe(licencia) {
    const desde = new Date(`${licencia.fecha_inicio}T00:00:00`)
    const hasta = new Date(`${licencia.fecha_termino}T00:00:00`)
    return Math.round((hasta - desde) / 86400000) + 1
}

const tabla = crearTabla({
    contenedor: "tablaLicencias",
    textoBuscar: "Buscar por trabajador, RUT o folio…",
    vacio: "No hay licencias registradas en esta empresa.",
    columnas: [
        { titulo: "Trabajador", valor: (l) => datosTrabajadores.porId.get(l.trabajador_id)?.nombre ?? "" },
        { titulo: "RUT", valor: (l) => datosTrabajadores.porId.get(l.trabajador_id)?.rut ?? "" },
        { titulo: "Desde", valor: (l) => l.fecha_inicio, html: (l) => escaparHtml(fechaCorta(l.fecha_inicio)) },
        { titulo: "Hasta", valor: (l) => l.fecha_termino, html: (l) => escaparHtml(fechaCorta(l.fecha_termino)) },
        { titulo: "Días", valor: (l) => diasDe(l), numero: true },
        { titulo: "Tipo", valor: (l) => TIPOS[l.tipo] ?? l.tipo },
        { titulo: "Pagador", valor: (l) => NOMBRE_PAGADOR[`${l.pagador_rut}-${l.pagador_dv}`] ?? `${l.pagador_rut}-${l.pagador_dv}` },
        { titulo: "Folio", valor: (l) => l.folio ?? "" },
        { titulo: "", orden: false, valor: () => "", html: (l) => `<button type="button" class="chico secundario" data-eliminar="${l.id}">Eliminar</button>` }
    ],
    filtros: [{ titulo: "Tipo", valor: (l) => l.tipo, opciones: Object.entries(TIPOS) }]
})

llenarSelect(document.getElementById("pagador"), PAGADORES.map(([rut, nombre]) => ({ id: rut, texto: nombre })), "Elige la entidad")

// No hay una ruta para todas las licencias de la empresa: se consultan por trabajador (los no postulantes).
async function cargarLicencias() {
    const conRelacion = datosTrabajadores.trabajadores.filter((t) => t.estado !== "postulante")
    const resultados = await Promise.all(conRelacion.map((t) => llamarApi(`/api/licencias-medicas?trabajador_id=${t.id}`)))
    licencias = resultados.filter((r) => r.status === 200).flatMap((r) => r.datos)
        .sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))
    tabla.mostrar(licencias)
}

document.getElementById("formLicencia").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()

    const trabajadorId = valorBuscador(document.getElementById("trabajador"))
    if (trabajadorId === null) {
        mensaje("error", "Elige un trabajador de la lista de sugerencias")
        return
    }

    const creada = await crearRegistro("/api/licencias-medicas", {
        trabajador_id: trabajadorId,
        fecha_inicio: document.getElementById("fechaInicio").value,
        fecha_termino: document.getElementById("fechaTermino").value,
        tipo: document.getElementById("tipo").value,
        pagador: document.getElementById("pagador").value,
        folio: document.getElementById("folio").value.trim() || null
    }, "Licencia registrada.")

    if (creada) {
        if (creada.advertencias?.length) {
            mensaje("info", ["Licencia registrada.", ...creada.advertencias].join(" "))
        }
        cerrarPanelCrear(this)
        cargarLicencias()
    }
})

document.getElementById("tablaLicencias").addEventListener("click", async function (evento) {
    const id = evento.target.closest("[data-eliminar]")?.dataset.eliminar
    if (!id || !confirm("¿Eliminar esta licencia? Los resúmenes de los meses abiertos se actualizan.")) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/licencias-medicas/${id}`, { method: "DELETE" })
    if (resultado.status !== 204 && resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo eliminar")
        return
    }
    mensaje("info", "Licencia eliminada.")
    cargarLicencias()
})

document.addEventListener("empresa-lista", async function () {
    limpiarMensajes()
    datosTrabajadores = (await trabajadoresDeLaEmpresa()) ?? datosTrabajadores
    llenarBuscador(document.getElementById("trabajador"), datosTrabajadores.trabajadores
        .filter((t) => t.estado !== "postulante")
        .map((t) => ({ id: t.id, texto: t.textoBuscador })))
    cargarLicencias()
})
