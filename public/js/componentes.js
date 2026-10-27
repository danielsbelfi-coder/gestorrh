// Piezas reutilizables de las pantallas: tabla con filtro y orden, buscador para elegir registros,
// formatos (RUT, fechas, pesos) y etiquetas de estado. Se carga después de api.js.

// ---------- Formatos ----------

function formatearRut(rut, dv) {
    if (!rut) {
        return ""
    }
    const cuerpo = String(rut).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    return dv ? `${cuerpo}-${dv}` : cuerpo
}

function nombreCompleto(persona) {
    if (!persona) {
        return ""
    }
    return [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" ")
}

function fechaCorta(texto) {
    return texto ? formatearFecha(String(texto).slice(0, 10)) : ""
}

function pesos(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return ""
    }
    return "$" + Math.round(Number(valor)).toLocaleString("es-CL")
}

// Texto sin tildes y en minúsculas, para buscar sin importar cómo se escriba.
function normalizar(texto) {
    return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// ---------- Estados ----------

const ESTADOS = {
    trabajador: {
        postulante: ["Postulante", "info"],
        activo: ["Activo", "exito"],
        suspendido: ["Suspendido", "advertencia"],
        con_licencia: ["Con licencia", "advertencia"],
        desvinculado: ["Desvinculado", "peligro"],
        historico: ["Histórico", ""]
    },
    situacionPersona: {
        trabajador: ["Trabajador", "exito"],
        postulante: ["Postulante", "info"],
        extrabajador: ["Extrabajador", ""],
        sin_relacion: ["Sin relación", ""]
    },
    contrato: {
        vigente: ["Vigente", "exito"],
        terminado: ["Terminado", ""],
        anulado: ["Anulado", "peligro"]
    },
    firma: {
        pendiente: ["Pendiente", "advertencia"],
        firmado: ["Firmado", "exito"],
        rechazado: ["Rechazado", "peligro"]
    },
    periodo: {
        abierto: ["Abierto", "exito"],
        cerrado: ["Cerrado", ""]
    },
    aprobacion: {
        pendiente: ["Pendiente", "advertencia"],
        aprobada: ["Aprobada", "exito"],
        rechazada: ["Rechazada", "peligro"]
    }
}

const TEXTOS = {
    tipoContrato: { indefinido: "Indefinido", plazo_fijo: "Plazo fijo", obra_faena: "Obra o faena" },
    tipoAsistencia: {
        normal: "Normal", atraso: "Atraso", inasistencia: "Inasistencia", permiso_con_goce: "Permiso con goce",
        permiso_sin_goce: "Permiso sin goce", vacaciones: "Vacaciones", licencia_medica: "Licencia médica"
    },
    fuenteAsistencia: { manual: "Manual", geovictoria: "GeoVictoria", importado_csv: "Importado CSV", otro: "Otro" }
}

function textoEstado(grupo, valor) {
    return ESTADOS[grupo]?.[valor]?.[0] ?? valor ?? ""
}

function insignia(grupo, valor) {
    const [texto, clase] = ESTADOS[grupo]?.[valor] ?? [valor ?? "", ""]
    return `<span class="insignia ${clase}">${escaparHtml(texto)}</span>`
}

// Situación de una persona según sus relaciones con la empresa.
function situacionPersona(trabajadoresDePersona) {
    if (trabajadoresDePersona.some((t) => ["activo", "suspendido", "con_licencia"].includes(t.estado))) {
        return "trabajador"
    }
    if (trabajadoresDePersona.some((t) => t.estado === "postulante")) {
        return "postulante"
    }
    if (trabajadoresDePersona.length > 0) {
        return "extrabajador"
    }
    return "sin_relacion"
}

// ---------- Tabla con filtro y orden ----------
// columnas: [{ titulo, valor(registro) → texto u número (para ordenar y buscar), html?(registro) → HTML ya escapado,
//              numero?: true, orden?: false }]
// filtros: [{ titulo, valor(registro) → clave, opciones: [[clave, texto]], inicial? }]

function crearTabla({ contenedor, columnas, filtros = [], textoBuscar = "Buscar…", vacio = "No hay registros." }) {
    const raiz = typeof contenedor === "string" ? document.getElementById(contenedor) : contenedor
    let datos = []
    let orden = { indice: null, sentido: 1 }

    raiz.classList.add("tabla-datos")
    raiz.innerHTML = `
        <div class="tabla-herramientas">
            <input type="search" class="tabla-buscar" placeholder="${escaparHtml(textoBuscar)}" aria-label="Buscar">
            ${filtros.map((filtro, i) => `
                <select class="tabla-filtro" data-filtro="${i}" aria-label="${escaparHtml(filtro.titulo)}">
                    <option value="">${escaparHtml(filtro.titulo)}: todos</option>
                    ${filtro.opciones.map(([clave, texto]) => `<option value="${escaparHtml(clave)}">${escaparHtml(texto)}</option>`).join("")}
                </select>`).join("")}
            <span class="tabla-total"></span>
        </div>
        <div class="tabla-marco">
            <table>
                <thead><tr>${columnas.map((columna, i) => columna.orden === false
                    ? `<th class="${columna.numero ? "numero" : ""}">${escaparHtml(columna.titulo)}</th>`
                    : `<th class="${columna.numero ? "numero" : ""}"><button type="button" class="tabla-orden" data-indice="${i}">${escaparHtml(columna.titulo)}<span class="flecha"></span></button></th>`
                ).join("")}</tr></thead>
                <tbody></tbody>
            </table>
        </div>`

    const buscador = raiz.querySelector(".tabla-buscar")
    const selects = [...raiz.querySelectorAll(".tabla-filtro")]
    filtros.forEach((filtro, i) => {
        if (filtro.inicial !== undefined) {
            selects[i].value = filtro.inicial
        }
    })

    function dibujar() {
        const texto = normalizar(buscador.value.trim())
        let filas = datos.filter((registro) =>
            selects.every((select, i) => select.value === "" || String(filtros[i].valor(registro)) === select.value)
            && (texto === "" || normalizar(columnas.map((columna) => columna.valor(registro)).join(" ")).includes(texto)))

        if (orden.indice !== null) {
            const columna = columnas[orden.indice]
            filas = [...filas].sort((a, b) => {
                const x = columna.valor(a)
                const y = columna.valor(b)
                const comparacion = typeof x === "number" && typeof y === "number"
                    ? x - y
                    : String(x ?? "").localeCompare(String(y ?? ""), "es", { numeric: true })
                return comparacion * orden.sentido
            })
        }

        raiz.querySelector("tbody").innerHTML = filas.length === 0
            ? `<tr><td colspan="${columnas.length}" class="tabla-vacia">${escaparHtml(datos.length === 0 ? vacio : "Ningún registro coincide con la búsqueda.")}</td></tr>`
            : filas.map((registro) => `<tr>${columnas.map((columna) =>
                `<td class="${columna.numero ? "numero" : ""}">${columna.html ? columna.html(registro) : escaparHtml(columna.valor(registro) ?? "")}</td>`
            ).join("")}</tr>`).join("")

        raiz.querySelector(".tabla-total").textContent = filas.length === datos.length
            ? `${datos.length} registro${datos.length === 1 ? "" : "s"}`
            : `${filas.length} de ${datos.length}`

        raiz.querySelectorAll(".tabla-orden").forEach((boton) => {
            const activo = Number(boton.dataset.indice) === orden.indice
            boton.querySelector(".flecha").textContent = activo ? (orden.sentido === 1 ? " ▲" : " ▼") : ""
        })
    }

    buscador.addEventListener("input", dibujar)
    selects.forEach((select) => select.addEventListener("change", dibujar))
    raiz.querySelector("thead").addEventListener("click", (evento) => {
        const boton = evento.target.closest(".tabla-orden")
        if (!boton) {
            return
        }
        const indice = Number(boton.dataset.indice)
        orden = { indice, sentido: orden.indice === indice ? -orden.sentido : 1 }
        dibujar()
    })

    return {
        mostrar(nuevos) {
            datos = nuevos
            dibujar()
        }
    }
}

// ---------- Buscador para elegir un registro ----------
// Convierte un <input> en un campo con sugerencias (datalist). El usuario escribe parte del nombre o RUT
// y elige; valorBuscador devuelve el id elegido o null si el texto no corresponde a una opción.

function llenarBuscador(input, opciones) {
    let lista = document.getElementById(input.id + "Opciones")
    if (!lista) {
        lista = document.createElement("datalist")
        lista.id = input.id + "Opciones"
        input.after(lista)
        input.setAttribute("list", lista.id)
        input.setAttribute("autocomplete", "off")
    }
    input._opciones = new Map(opciones.map(({ id, texto }) => [texto, id]))
    lista.innerHTML = opciones.map(({ texto }) => `<option value="${escaparHtml(texto)}"></option>`).join("")
}

function valorBuscador(input) {
    return input._opciones?.get(input.value) ?? null
}

// Llena un <select> con opciones [{ id, texto }]; primera opción opcional (por ejemplo "Elige…").
function llenarSelect(select, opciones, primera) {
    select.innerHTML = (primera ? `<option value="">${escaparHtml(primera)}</option>` : "")
        + opciones.map(({ id, texto }) => `<option value="${escaparHtml(id)}">${escaparHtml(texto)}</option>`).join("")
}

// ---------- Datos comunes de la empresa de trabajo ----------

async function cargarListas(rutas) {
    const resultados = await Promise.all(rutas.map((ruta) => llamarApi(ruta)))
    const error = resultados.find((resultado) => resultado.status !== 200)
    if (error) {
        document.getElementById("mensajeError").textContent = error.datos?.error ?? "No se pudieron cargar los datos"
        return null
    }
    return resultados.map((resultado) => resultado.datos)
}

function porId(lista) {
    return new Map(lista.map((registro) => [registro.id, registro]))
}

function textoPersona(persona) {
    return `${nombreCompleto(persona)} · ${formatearRut(persona.rut, persona.dv)}`
}

// ---------- Mensajes y creación ----------

function mensaje(tipo, texto) {
    const elemento = document.getElementById(tipo === "error" ? "mensajeError" : "mensajeInfo")
    if (elemento) {
        elemento.textContent = texto
    }
}

function limpiarMensajes() {
    mensaje("error", "")
    mensaje("info", "")
    const problemas = document.getElementById("listaProblemas")
    if (problemas) {
        problemas.innerHTML = ""
    }
}

// POST de creación. Devuelve el registro creado o null (y deja el error en pantalla).
async function crearRegistro(ruta, datos, textoExito) {
    limpiarMensajes()
    const resultado = await llamarApi(ruta, { method: "POST", body: JSON.stringify(datos) })
    if (resultado.status !== 201) {
        mensaje("error", resultado.datos?.error ?? "No se pudo guardar")
        return null
    }
    mensaje("info", textoExito)
    return resultado.datos
}

// Cierra el panel plegable de creación y limpia su formulario.
function cerrarPanelCrear(formulario) {
    formulario.reset()
    document.getElementById("panelCrear")?.removeAttribute("open")
}

function opcionesDe(grupo) {
    return Object.entries(ESTADOS[grupo]).map(([clave, [texto]]) => [clave, texto])
}
