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

const TIPOS_JORNADA = { semanal: "Semanal", promedio: "En promedio (22 bis)", bisemanal: "Bisemanal (art. 39)", excepcional: "Excepcional (art. 38)" }
const AYUDA_TIPO = {
    semanal: "La misma semana se repite siempre: 4 a 6 días y hasta el máximo legal semanal.",
    promedio: "Ciclos de 2, 3 o 4 semanas (14, 21 o 28 días) que empiezan un lunes: ninguna semana pasa de 45 horas, no más de dos semanas seguidas sobre el máximo y el promedio del ciclo no pasa del máximo legal. Requiere pacto escrito (con el sindicato si el trabajador está sindicalizado).",
    bisemanal: "Para faenas alejadas de centros urbanos: hasta 14 días seguidos de trabajo y luego el descanso compensatorio de los domingos y festivos del período, más uno. El promedio del ciclo no pasa del máximo legal.",
    excepcional: "Los sistemas 7x7, 4x4, 10x10, 14x14 u otros autorizados por resolución de la Dirección del Trabajo (hasta tres años de vigencia). Hasta 12 horas diarias; la resolución regula el sistema."
}

ESTADOS.jornada = { true: ["Activa", "exito"], false: ["Inactiva", ""] }

const tabla = crearTabla({
    contenedor: "tablaJornadas",
    textoBuscar: "Buscar jornada…",
    vacio: "La empresa todavía no tiene jornadas. Crea la primera arriba.",
    columnas: [
        { titulo: "Nombre", valor: (j) => j.nombre },
        { titulo: "Tipo", valor: (j) => TIPOS_JORNADA[j.tipo ?? "semanal"] },
        { titulo: "Distribución", valor: (j) => textoDistribucion(j.dias, j.tipo) + (j.tipo && j.tipo !== "semanal" && j.inicio_ciclo ? ` · ciclo de ${j.ciclo_dias} días desde el ${fechaCorta(j.inicio_ciclo)}` : "") },
        { titulo: "Horas semanales", valor: (j) => Number(j.horas_semanales), numero: true },
        { titulo: "Días por semana", valor: (j) => Number(j.dias_trabajados), numero: true },
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

// ---------- Editor de los días del ciclo ----------

const tipoActual = () => document.getElementById("tipo").value
const porCiclo = () => tipoActual() !== "semanal"
const largoCiclo = () => (porCiclo() ? Math.max(2, Math.min(56, Number(document.getElementById("cicloDias").value) || 7)) : 7)

function nombreDia(numero) {
    return porCiclo() ? `Día ${numero}` : NOMBRES_DIA[numero - 1].charAt(0).toUpperCase() + NOMBRES_DIA[numero - 1].slice(1)
}

function fechaDelDia(numero) {
    const inicio = document.getElementById("inicioCiclo").value
    if (!porCiclo() || !inicio) {
        return ""
    }
    const fecha = new Date(`${inicio}T00:00:00Z`)
    fecha.setUTCDate(fecha.getUTCDate() + numero - 1)
    const iso = fecha.toISOString().slice(0, 10)
    return `${NOMBRES_DIA[(fecha.getUTCDay() + 6) % 7].slice(0, 3)} ${fechaCorta(iso).slice(0, 5)}`
}

function filaPorDefecto(i) {
    if (porCiclo()) {
        return { trabaja: false, entrada: "08:00", salida: "20:00", colacion: 60 }
    }
    return { trabaja: i < 5, entrada: "08:00", salida: i < 4 ? "17:30" : "17:00", colacion: 60 }
}

function dibujarFilas(dias) {
    const largo = largoCiclo()
    document.getElementById("cabeceraFecha").hidden = !porCiclo()
    document.getElementById("filasDias").innerHTML = Array.from({ length: largo }, (_, i) => {
        const d = dias?.[i] ?? filaPorDefecto(i)
        const nombre = nombreDia(i + 1)
        return `<tr data-dia="${i + 1}">
            <td>${escaparHtml(nombre)}</td>
            ${porCiclo() ? `<td class="texto-suave fecha-ciclo">${escaparHtml(fechaDelDia(i + 1))}</td>` : ""}
            <td><input type="checkbox" class="trabaja" ${d.trabaja ? "checked" : ""} aria-label="Trabaja: ${escaparHtml(nombre)}"></td>
            <td><input type="time" class="entrada" value="${escaparHtml(d.entrada ?? "08:00")}"></td>
            <td><input type="time" class="salida" value="${escaparHtml(d.salida ?? "17:00")}"></td>
            <td><input type="number" class="colacion" min="0" step="5" value="${escaparHtml(d.colacion ?? 60)}"></td>
            <td class="numero horas"></td>
        </tr>`
    }).join("")
    document.getElementById("copiarLunes").textContent = porCiclo() ? "Copiar el horario del día 1 a los días marcados" : "Copiar el horario del lunes a los días marcados"
    document.getElementById("pieAcciones").colSpan = porCiclo() ? 6 : 5
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

// Muestra u oculta los campos del ciclo y de la resolución según el tipo.
function aplicarTipo() {
    const tipo = tipoActual()
    document.querySelectorAll("[data-ciclo]").forEach((el) => { el.hidden = tipo === "semanal" })
    document.querySelectorAll("[data-excepcional]").forEach((el) => { el.hidden = tipo !== "excepcional" })
    const ciclo = document.getElementById("cicloDias")
    if (tipo === "promedio") {
        ciclo.min = 14
        ciclo.max = 28
        ciclo.step = 7
    } else {
        ciclo.min = 2
        ciclo.max = 56
        ciclo.step = 1
    }
    document.getElementById("ayudaTipo").textContent = AYUDA_TIPO[tipo]
}

function recalcular() {
    const tipo = tipoActual()
    const maximoDiario = tipo === "excepcional" ? 12 : 10
    const largo = largoCiclo()
    let total = 0
    let dias = 0
    const errores = []
    const advertencias = []
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
        const nocturno = trabaja && dia.entrada && dia.salida && dia.salida < dia.entrada
        fila.querySelector(".horas").textContent = trabaja ? `${horas.toLocaleString("es-CL")}${nocturno ? " (termina al día siguiente)" : ""}` : porCiclo() ? "Descanso" : "Libre"
        fila.querySelector(".horas").classList.toggle("excedido", horas > maximoDiario)
        total += horas
        dias += trabaja ? 1 : 0
        if (!trabaja) {
            continue
        }
        const nombre = nombreDia(Number(fila.dataset.dia))
        if (!dia.entrada || !dia.salida || horas <= 0) {
            errores.push(`${nombre}: no tiene un horario válido (indica entrada y salida distintas; si la salida es anterior a la entrada, el turno termina al día siguiente).`)
        } else if (horas > maximoDiario) {
            errores.push(`${nombre}: suma ${horas.toLocaleString("es-CL")} horas y la jornada diaria no puede superar ${maximoDiario} horas.`)
        }
        if (dia.colacion < 30) {
            advertencias.push(`${nombre}: tiene ${dia.colacion} minutos de colación; lo habitual es al menos 30.`)
        }
    }
    total = Math.round(total * 100) / 100
    const promedio = Math.round(total * 7 / largo * 100) / 100
    const elemento = document.getElementById("totalSemana")
    elemento.textContent = promedio.toLocaleString("es-CL")
    document.getElementById("detalleCiclo").textContent = porCiclo()
        ? `promedio semanal · ${total.toLocaleString("es-CL")} h en ${dias} de ${largo} días`
        : ""

    if (tipo === "semanal" && (dias < 4 || dias > 6)) {
        errores.push(`La jornada debe distribuirse en 4 a 6 días (hay ${dias} marcados).`)
    }
    if (porCiclo() && dias === 0) {
        errores.push("Marca los días de trabajo del ciclo (o usa «Armar el ciclo»).")
    }
    if (porCiclo() && !document.getElementById("inicioCiclo").value) {
        errores.push("Indica la fecha del día 1 del ciclo.")
    }
    if (promedio > MAXIMO) {
        const texto = `${porCiclo() ? "El ciclo promedia" : "La semana suma"} ${promedio.toLocaleString("es-CL")} horas semanales y el máximo legal vigente es ${MAXIMO}.`
        if (tipo === "excepcional") {
            advertencias.push(`${texto} Solo procede si la resolución lo autoriza.`)
        } else {
            errores.push(texto)
        }
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

document.getElementById("tipo").addEventListener("change", function () {
    aplicarTipo()
    if (tipoActual() === "promedio" && ![14, 21, 28].includes(Number(document.getElementById("cicloDias").value))) {
        document.getElementById("cicloDias").value = 14
    }
    dibujarFilas(null)
})

// Cambiar el largo del ciclo conserva los días ya cargados que siguen existiendo.
document.getElementById("cicloDias").addEventListener("change", () => dibujarFilas(leerDias()))
document.getElementById("inicioCiclo").addEventListener("change", () => dibujarFilas(leerDias()))

// «Armar el ciclo»: N días de trabajo con el mismo horario y luego M de descanso.
document.getElementById("generarPatron").addEventListener("click", function () {
    const trabajo = Number(document.getElementById("patronTrabajo").value)
    const descanso = Number(document.getElementById("patronDescanso").value)
    if (!(trabajo >= 1) || !(descanso >= 1) || trabajo + descanso > 56) {
        mensaje("error", "Indica los días de trabajo y de descanso (en total, hasta 56).")
        return
    }
    const horario = {
        entrada: document.getElementById("patronEntrada").value,
        salida: document.getElementById("patronSalida").value,
        colacion: Number(document.getElementById("patronColacion").value || 0)
    }
    document.getElementById("cicloDias").value = trabajo + descanso
    dibujarFilas(Array.from({ length: trabajo + descanso }, (_, i) => ({ trabaja: i < trabajo, ...horario })))
})

document.getElementById("copiarLunes").addEventListener("click", function () {
    const [primero, ...resto] = document.querySelectorAll("#filasDias tr")
    for (const fila of resto) {
        if (fila.querySelector(".trabaja").checked) {
            for (const clase of [".entrada", ".salida", ".colacion"]) {
                fila.querySelector(clase).value = primero.querySelector(clase).value
            }
        }
    }
    recalcular()
})

function salirDeEdicion() {
    jornadaEnEdicion = null
    formulario.reset()
    aplicarTipo()
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

    const tipo = tipoActual()
    const cuerpo = { nombre: document.getElementById("nombre").value.trim(), tipo, dias: leerDias() }
    if (tipo !== "semanal") {
        cuerpo.ciclo_dias = largoCiclo()
        cuerpo.inicio_ciclo = document.getElementById("inicioCiclo").value
    }
    if (tipo === "excepcional") {
        cuerpo.resolucion_numero = document.getElementById("resolucionNumero").value.trim()
        cuerpo.resolucion_fecha = document.getElementById("resolucionFecha").value
        cuerpo.resolucion_vigencia_hasta = document.getElementById("resolucionVigencia").value
    }
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
        document.getElementById("tipo").value = jornadaEnEdicion.tipo ?? "semanal"
        document.getElementById("cicloDias").value = jornadaEnEdicion.ciclo_dias ?? 7
        document.getElementById("inicioCiclo").value = jornadaEnEdicion.inicio_ciclo ?? ""
        document.getElementById("resolucionNumero").value = jornadaEnEdicion.resolucion_numero ?? ""
        document.getElementById("resolucionFecha").value = jornadaEnEdicion.resolucion_fecha ?? ""
        document.getElementById("resolucionVigencia").value = jornadaEnEdicion.resolucion_vigencia_hasta ?? ""
        aplicarTipo()
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

aplicarTipo()
dibujarFilas(null)
document.addEventListener("empresa-lista", () => { limpiarMensajes(); salirDeEdicion(); cargarJornadas() })
