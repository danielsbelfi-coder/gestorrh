requiereLogin()

const formulario = document.getElementById("formJornada")
let jornadas = []
let jornadaEnEdicion = null

function maximoSemanal(fecha) {
    if (fecha >= "2028-04-26") {
        return 40
    }
    return fecha >= "2026-04-26" ? 42 : 44
}
const MAXIMO = maximoSemanal(hoyIso())
document.getElementById("maximoLegal").textContent = MAXIMO

ESTADOS.jornada = { true: ["Activa", "exito"], false: ["Inactiva", ""] }

const tabla = crearTabla({
    contenedor: "tablaJornadas",
    textoBuscar: "Buscar jornada…",
    vacio: "La empresa todavía no tiene jornadas. Crea la primera arriba.",
    columnas: [
        { titulo: "Nombre", valor: (j) => j.nombre },
        { titulo: "Distribución", valor: (j) => textoDistribucion(j.dias) },
        { titulo: "Horas semanales", valor: (j) => Number(j.horas_semanales), numero: true },
        { titulo: "Días", valor: (j) => j.dias_trabajados, numero: true },
        { titulo: "Estado", valor: (j) => textoEstado("jornada", String(j.activo)), html: (j) => insignia("jornada", String(j.activo)) },
        {
            titulo: "", orden: false, valor: () => "",
            html: (j) => `<button type="button" class="chico secundario" data-editar="${j.id}">Editar</button>
                ${j.activo
                    ? `<button type="button" class="chico secundario" data-estado="desactivar" data-id="${j.id}">Desactivar</button>`
                    : `<button type="button" class="chico" data-estado="reactivar" data-id="${j.id}">Reactivar</button>`}`
        }
    ],
    filtros: [{ titulo: "Estado", valor: (j) => String(j.activo), opciones: [["true", "Activas"], ["false", "Inactivas"]], inicial: "true" }]
})

// ---------- Editor de los 7 días ----------

function dibujarFilas(dias) {
    document.getElementById("filasDias").innerHTML = NOMBRES_DIA.map((nombre, i) => {
        const d = dias?.[i] ?? { trabaja: i < 5, entrada: "08:00", salida: i < 4 ? "17:30" : "17:00", colacion: 60 }
        return `<tr data-dia="${i + 1}">
            <td>${escaparHtml(nombre.charAt(0).toUpperCase() + nombre.slice(1))}</td>
            <td><input type="checkbox" class="trabaja" ${d.trabaja ? "checked" : ""} aria-label="Trabaja el ${nombre}"></td>
            <td><input type="time" class="entrada" value="${escaparHtml(d.entrada ?? "08:00")}"></td>
            <td><input type="time" class="salida" value="${escaparHtml(d.salida ?? "17:00")}"></td>
            <td><input type="number" class="colacion" min="0" step="5" value="${escaparHtml(d.colacion ?? 60)}"></td>
            <td class="numero horas"></td>
        </tr>`
    }).join("")
    recalcular()
}

function leerDias() {
    return [...document.querySelectorAll("#filasDias tr")].map((fila) => ({
        dia: Number(fila.dataset.dia),
        trabaja: fila.querySelector(".trabaja").checked,
        entrada: fila.querySelector(".entrada").value,
        salida: fila.querySelector(".salida").value,
        colacion: Number(fila.querySelector(".colacion").value || 0)
    }))
}

function recalcular() {
    let total = 0
    let dias = 0
    for (const fila of document.querySelectorAll("#filasDias tr")) {
        const trabaja = fila.querySelector(".trabaja").checked
        fila.querySelectorAll(".entrada, .salida, .colacion").forEach((campo) => { campo.disabled = !trabaja })
        fila.classList.toggle("dia-libre", !trabaja)
        const dia = {
            trabaja,
            entrada: fila.querySelector(".entrada").value,
            salida: fila.querySelector(".salida").value,
            colacion: Number(fila.querySelector(".colacion").value || 0)
        }
        const horas = horasDelDia(dia)
        fila.querySelector(".horas").textContent = trabaja ? horas.toLocaleString("es-CL") : "Libre"
        fila.querySelector(".horas").classList.toggle("excedido", horas > 10)
        total += horas
        dias += trabaja ? 1 : 0
    }
    total = Math.round(total * 100) / 100
    const elemento = document.getElementById("totalSemana")
    elemento.textContent = total.toLocaleString("es-CL")

    const errores = []
    const advertencias = []
    for (const fila of document.querySelectorAll("#filasDias tr")) {
        if (!fila.querySelector(".trabaja").checked) {
            continue
        }
        const nombre = NOMBRES_DIA[Number(fila.dataset.dia) - 1]
        const dia = {
            trabaja: true,
            entrada: fila.querySelector(".entrada").value,
            salida: fila.querySelector(".salida").value,
            colacion: Number(fila.querySelector(".colacion").value || 0)
        }
        if (!dia.entrada || !dia.salida || horasDelDia(dia) <= 0) {
            errores.push(`El ${nombre} no tiene un horario válido (la salida debe ser posterior a la entrada).`)
        } else if (horasDelDia(dia) > 10) {
            errores.push(`El ${nombre} suma ${horasDelDia(dia).toLocaleString("es-CL")} horas: la jornada diaria no puede superar 10 horas.`)
        }
        if (dia.colacion < 30) {
            advertencias.push(`El ${nombre} tiene ${dia.colacion} minutos de colación; lo habitual es al menos 30.`)
        }
    }
    if (total > MAXIMO) {
        errores.push(`La semana suma ${total.toLocaleString("es-CL")} horas y el máximo legal vigente es ${MAXIMO}.`)
    }
    if (dias < 4 || dias > 6) {
        errores.push(`La jornada debe distribuirse en 4 a 6 días (hay ${dias} marcados).`)
    }

    elemento.classList.toggle("excedido", errores.length > 0)
    document.getElementById("problemasJornada").innerHTML = [
        ...errores.map((t) => `<li class="error">${escaparHtml(t)}</li>`),
        ...advertencias.map((t) => `<li class="aviso">${escaparHtml(t)}</li>`)
    ].join("")
    const boton = document.getElementById("botonGuardar")
    boton.disabled = errores.length > 0
    boton.title = errores.length > 0 ? "Corrige los problemas marcados en rojo para poder guardar" : ""
}

document.getElementById("filasDias").addEventListener("input", recalcular)

document.getElementById("copiarLunes").addEventListener("click", function () {
    const [lunes, ...resto] = document.querySelectorAll("#filasDias tr")
    for (const fila of resto) {
        if (fila.querySelector(".trabaja").checked) {
            for (const clase of [".entrada", ".salida", ".colacion"]) {
                fila.querySelector(clase).value = lunes.querySelector(clase).value
            }
        }
    }
    recalcular()
})

function salirDeEdicion() {
    jornadaEnEdicion = null
    formulario.reset()
    dibujarFilas(null)
    document.getElementById("tituloPanel").textContent = "＋ Nueva jornada"
    document.getElementById("botonGuardar").textContent = "Crear jornada"
    document.getElementById("cancelarEdicion").hidden = true
}

document.getElementById("cancelarEdicion").addEventListener("click", () => {
    salirDeEdicion()
    document.getElementById("panelCrear").removeAttribute("open")
})

// ---------- Datos ----------

async function cargarJornadas() {
    const resultado = await llamarApi(`/api/jornadas?empresa_id=${empresaActual()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar las jornadas")
        return
    }
    jornadas = resultado.datos
    tabla.mostrar(jornadas)
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault()
    limpiarMensajes()
    if (exigirEmpresaActual() === null) {
        return
    }

    const cuerpo = { nombre: document.getElementById("nombre").value.trim(), dias: leerDias() }
    const resultado = jornadaEnEdicion
        ? await llamarApi(`/api/jornadas/${jornadaEnEdicion.id}`, { method: "PATCH", body: JSON.stringify(cuerpo) })
        : await llamarApi("/api/jornadas", { method: "POST", body: JSON.stringify({ ...cuerpo, empresa_id: empresaActual() }) })

    if (resultado.status !== 200 && resultado.status !== 201) {
        const texto = resultado.datos?.error ?? "No se pudo guardar la jornada"
        const lista = document.getElementById("problemasJornada")
        lista.insertAdjacentHTML("afterbegin", `<li class="error">${escaparHtml(texto)}</li>`)
        lista.scrollIntoView({ behavior: "smooth", block: "nearest" })
        return
    }
    const advertencias = resultado.datos.advertencias ?? []
    mensaje("info", [jornadaEnEdicion ? "Jornada actualizada." : "Jornada creada.", ...advertencias].join(" "))
    salirDeEdicion()
    document.getElementById("panelCrear").removeAttribute("open")
    cargarJornadas()
})

document.getElementById("tablaJornadas").addEventListener("click", async function (evento) {
    const editar = evento.target.closest("[data-editar]")?.dataset.editar
    if (editar) {
        jornadaEnEdicion = jornadas.find((j) => String(j.id) === editar)
        document.getElementById("nombre").value = jornadaEnEdicion.nombre
        dibujarFilas(jornadaEnEdicion.dias)
        document.getElementById("tituloPanel").textContent = `Editar: ${jornadaEnEdicion.nombre}`
        document.getElementById("botonGuardar").textContent = "Guardar cambios"
        document.getElementById("cancelarEdicion").hidden = false
        document.getElementById("panelCrear").open = true
        document.getElementById("panelCrear").scrollIntoView({ behavior: "smooth", block: "start" })
        return
    }

    const boton = evento.target.closest("[data-estado]")
    if (!boton) {
        return
    }
    limpiarMensajes()
    const resultado = await llamarApi(`/api/jornadas/${boton.dataset.id}/${boton.dataset.estado}`, { method: "PATCH" })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cambiar el estado")
        return
    }
    mensaje("info", boton.dataset.estado === "desactivar" ? "Jornada desactivada: ya no se puede asignar a contratos nuevos." : "Jornada reactivada.")
    cargarJornadas()
})

dibujarFilas(null)
document.addEventListener("empresa-lista", () => { limpiarMensajes(); salirDeEdicion(); cargarJornadas() })
