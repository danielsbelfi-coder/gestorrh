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

// La columna de botones (sin título y sin orden) queda fija a la derecha: se ve sin mover la barra horizontal.
function claseColumna(columna) {
    if (columna.orden === false && columna.titulo === "") {
        return "col-acciones"
    }
    return columna.numero ? "numero" : ""
}

function crearTabla({ contenedor, columnas, filtros = [], textoBuscar = "Buscar…", vacio = "No hay registros." }) {
    const raiz = typeof contenedor === "string" ? document.getElementById(contenedor) : contenedor
    let datos = []
    let orden = { indice: null, sentido: 1 }
    let visibles = []

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
                    ? `<th class="${claseColumna(columna)}">${escaparHtml(columna.titulo)}</th>`
                    : `<th class="${claseColumna(columna)}"><button type="button" class="tabla-orden" data-indice="${i}">${escaparHtml(columna.titulo)}<span class="flecha"></span></button></th>`
                ).join("")}</tr></thead>
                <tbody></tbody>
            </table>
        </div>`

    const buscador = raiz.querySelector(".tabla-buscar")
    // Se puede llegar con la búsqueda hecha: pagina.html?buscar=texto
    buscador.value = new URLSearchParams(location.search).get("buscar") ?? ""
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

        visibles = filas
        raiz.querySelector("tbody").innerHTML = filas.length === 0
            ? `<tr><td colspan="${columnas.length}" class="tabla-vacia">${escaparHtml(datos.length === 0 ? vacio : "Ningún registro coincide con la búsqueda.")}</td></tr>`
            : filas.map((registro) => `<tr>${columnas.map((columna) =>
                `<td class="${claseColumna(columna)}">${columna.html ? columna.html(registro) : escaparHtml(columna.valor(registro) ?? "")}</td>`
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
        },
        // Registros que se ven ahora (con búsqueda, filtros y orden aplicados).
        visibles() {
            return visibles
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

// ---------- Remuneraciones ----------

ESTADOS.liquidacion = {
    calculada: ["Por cerrar", "advertencia"],
    emitida: ["Cerrada", "exito"]
}

ESTADOS.finiquito = {
    sin_calcular: ["Sin calcular", ""],
    calculado: ["Por cerrar", "advertencia"],
    emitido: ["Cerrado", "info"],
    pagado: ["Pagado", "exito"]
}

// Tabla de causales de término de la Dirección del Trabajo (copia de src/shared/causales_termino.js).
const CAUSALES = {
    3: "Art. 159 N° 1: Mutuo acuerdo de las partes",
    4: "Art. 159 N° 2: Renuncia del trabajador",
    5: "Art. 159 N° 3: Muerte del trabajador",
    6: "Art. 159 N° 4: Vencimiento del plazo convenido en el contrato",
    7: "Art. 159 N° 5: Conclusión del trabajo o servicio que dio origen al contrato",
    8: "Art. 159 N° 6: Caso fortuito o fuerza mayor",
    11: "Art. 160 N° 2: Negociaciones prohibidas por escrito",
    12: "Art. 160 N° 3: No concurrencia a las labores",
    13: "Art. 160 N° 4: Abandono del trabajo",
    14: "Art. 160 N° 5: Actos, omisiones o imprudencias temerarias",
    15: "Art. 160 N° 6: Perjuicio material causado intencionalmente",
    16: "Art. 160 N° 7: Incumplimiento grave de las obligaciones que impone el contrato",
    18: "Art. 161 inciso 1°: Necesidades de la empresa",
    19: "Art. 161 inciso 2°: Desahucio escrito del empleador",
    20: "Art. 163 bis: Procedimiento concursal de liquidación",
    24: "Art. 160 N° 1 letra a): Falta de probidad",
    25: "Art. 160 N° 1 letra b): Conductas de acoso sexual",
    26: "Art. 160 N° 1 letra c): Vías de hecho",
    27: "Art. 160 N° 1 letra d): Injurias",
    28: "Art. 160 N° 1 letra e): Conducta inmoral",
    29: "Art. 160 N° 1 letra f): Conductas de acoso laboral"
}

// ¿El trabajador estuvo contratado al menos un día del mes del periodo? (misma regla del backend)
function vigenteEnPeriodo(trabajador, periodo) {
    const mm = String(periodo.mes).padStart(2, "0")
    const primerDia = `${periodo.anio}-${mm}-01`
    const ultimoDia = `${periodo.anio}-${mm}-${String(new Date(periodo.anio, periodo.mes, 0).getDate()).padStart(2, "0")}`
    return trabajador.estado !== "postulante"
        && Boolean(trabajador.fecha_ingreso) && trabajador.fecha_ingreso <= ultimoDia
        && (!trabajador.fecha_termino || trabajador.fecha_termino >= primerDia)
}

// Lista de problemas con nombre del trabajador: [{ nombre, motivos }]
function mostrarProblemasConNombre(problemas) {
    document.getElementById("listaProblemas").innerHTML = problemas.map((problema) =>
        `<li><strong>${escaparHtml(problema.nombre)}:</strong> ${escaparHtml(problema.motivos.join("; "))}</li>`).join("")
}

// Selector de periodos de la empresa de trabajo. Devuelve los periodos (del más reciente al más antiguo).
async function llenarSelectorPeriodos(select) {
    const listas = await cargarListas(["/api/periodos-remuneracion"])
    if (!listas) {
        return []
    }
    const periodos = deEmpresaActual(listas[0]).sort((a, b) => b.anio - a.anio || b.mes - a.mes)

    select.innerHTML = periodos.map((periodo) =>
        `<option value="${periodo.id}">${escaparHtml(nombrePeriodo(periodo) + (periodo.estado === "abierto" ? "" : " (cerrado)"))}</option>`).join("")

    // Orden de preferencia: el periodo pedido en la URL, el último elegido en esta empresa, el abierto más reciente.
    const existe = (id) => id && periodos.some((periodo) => String(periodo.id) === String(id))
    const pedido = new URLSearchParams(location.search).get("periodo")
    const recordado = leerPeriodoRecordado()
    if (existe(pedido)) {
        select.value = pedido
        history.replaceState(null, "", location.pathname)
    } else if (existe(recordado)) {
        select.value = recordado
    } else {
        const abierto = periodos.find((periodo) => periodo.estado === "abierto")
        if (abierto) {
            select.value = abierto.id
        }
    }
    recordarPeriodo(select.value)

    // Al cambiar de periodo en cualquier pantalla, las demás abren en ese mismo periodo.
    if (!select.dataset.recuerda) {
        select.dataset.recuerda = "si"
        select.addEventListener("change", () => recordarPeriodo(select.value))
    }
    return periodos
}

// El periodo elegido se recuerda por empresa en este navegador.
function leerPeriodoRecordado() {
    try {
        return localStorage.getItem(`periodo_${empresaActual()}`)
    } catch {
        return null
    }
}

function recordarPeriodo(id) {
    if (!id) {
        return
    }
    try {
        localStorage.setItem(`periodo_${empresaActual()}`, String(id))
    } catch {
        // Sin almacenamiento disponible: cada pantalla abre en el periodo abierto más reciente.
    }
}

// ---------- Descarga CSV para Excel ----------
// Separador punto y coma y BOM UTF-8: Excel en español lo abre con columnas y tildes correctas.
// columnas: [[titulo, valor(registro)]]

function descargarCsv(nombreArchivo, columnas, registros) {
    const celda = (valor) => {
        let texto = String(valor ?? "")
        // Un texto que empieza con = + - @ Excel lo trata como fórmula: se antepone un apóstrofo (los números negativos quedan igual).
        if (typeof valor !== "number" && /^[=+\-@\t\r]/.test(texto) && Number.isNaN(Number(texto))) {
            texto = "'" + texto
        }
        return /[";\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
    }
    const lineas = [
        columnas.map(([titulo]) => celda(titulo)).join(";"),
        ...registros.map((registro) => columnas.map(([, valor]) => celda(valor(registro))).join(";"))
    ]
    const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = nombreArchivo
    enlace.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Nómina bancaria: descarga el CSV (genérico, para cargar o adaptar en el banco) y muestra a quienes quedaron fuera.
// datos = { filas, excluidas, total } del servidor.
function descargarNomina(nombreArchivo, datos) {
    if (datos.filas.length > 0) {
        descargarCsv(nombreArchivo, [
            ["RUT", (f) => f.rut],
            ["Nombre", (f) => f.nombre],
            ["Código banco", (f) => f.banco_codigo],
            ["Banco", (f) => f.banco],
            ["Tipo de cuenta", (f) => f.tipo_cuenta],
            ["Número de cuenta", (f) => f.numero_cuenta],
            ["Monto", (f) => f.monto],
            ["Correo", (f) => f.email],
            ["Glosa", (f) => f.glosa]
        ], datos.filas)
    }
    const resumen = datos.filas.length > 0
        ? `Nómina descargada: ${datos.filas.length} pago(s) por ${pesos(datos.total)}.`
        : "No hay pagos por transferencia para incluir en la nómina."
    if (datos.excluidas.length === 0) {
        mensaje("info", resumen)
        return
    }
    mensaje("info", resumen)
    mensaje("error", `${datos.excluidas.length} quedaron fuera del archivo (págalos de otra forma o completa sus datos):`)
    mostrarProblemasConNombre(datos.excluidas.map((e) => ({ nombre: `${e.nombre} (${e.rut}, ${pesos(e.monto)})`, motivos: [e.motivo] })))
}

function hoyIso() {
    const hoy = new Date()
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`
}

// ---------- Contratos ----------

const TEXTOS_CONTRATO = {
    tipoJornada: { completa: "Completa", parcial: "Parcial", excluido_limitacion: "Excluido de limitación" },
    sistemaRemuneracion: { mensual: "Mensual", diario: "Diario", semanal: "Semanal", hora: "Por hora" },
    periodicidadPago: { mensual: "Mensual", quincenal: "Quincenal", semanal: "Semanal" }
}

// Campos que un anexo puede modificar (CAMPOS_MODIFICABLES de contrato_anexo.service.js).
const CAMPOS_ANEXO = {
    sueldo_base: { texto: "Sueldo base", tipo: "numero" },
    horas_semanales: { texto: "Horas semanales", tipo: "numero" },
    tipo_jornada: { texto: "Tipo de jornada", tipo: "lista", opciones: TEXTOS_CONTRATO.tipoJornada },
    dias_trabajados: { texto: "Días trabajados por semana", tipo: "numero" },
    funciones: { texto: "Funciones", tipo: "texto" },
    lugar_prestacion_servicios: { texto: "Lugar de prestación de servicios", tipo: "texto" },
    sistema_remuneracion: { texto: "Sistema de remuneración", tipo: "lista", opciones: TEXTOS_CONTRATO.sistemaRemuneracion },
    periodicidad_pago: { texto: "Periodicidad de pago", tipo: "lista", opciones: TEXTOS_CONTRATO.periodicidadPago },
    fecha_termino: { texto: "Fecha de término", tipo: "fecha" },
    comuna_prestacion: { texto: "Comuna de prestación", tipo: "comuna" },
    jornada_id: { texto: "Jornada (horario)", tipo: "jornada" }
}

// Plantillas de jornada conocidas por la pantalla (id → jornada), para mostrar su nombre en anexos.
let jornadasConocidas = new Map()

// Muestra un valor de contrato o anexo en palabras (montos con $, fechas dd-mm-aaaa, comunas con nombre).
function valorContrato(campo, valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "—"
    }
    const definicion = CAMPOS_ANEXO[campo]
    if (campo === "sueldo_base") {
        return pesos(valor)
    }
    if (definicion?.tipo === "fecha") {
        return fechaCorta(valor)
    }
    if (definicion?.tipo === "lista") {
        return definicion.opciones[valor] ?? valor
    }
    if (definicion?.tipo === "jornada") {
        return jornadasConocidas.get(Number(valor))?.nombre ?? `Jornada #${valor}`
    }
    if (definicion?.tipo === "comuna") {
        return typeof COMUNAS !== "undefined" && COMUNAS[valor] ? `${COMUNAS[valor]} (${valor})` : String(valor)
    }
    return String(valor)
}

// ---------- Ciclo mensual ----------

// Texto de un trabajador para los buscadores: nombre, RUT y su relación laboral (desde y, si terminó, hasta).
// Así se distinguen dos relaciones de la misma persona (por ejemplo, un finiquito y una recontratación).
function textoTrabajador(trabajador, persona) {
    const relacion = trabajador.fecha_termino
        ? `desde ${fechaCorta(trabajador.fecha_ingreso)} hasta ${fechaCorta(trabajador.fecha_termino)}`
        : `desde ${fechaCorta(trabajador.fecha_ingreso)}`
    return `${persona ? textoPersona(persona) : "Trabajador " + trabajador.id} · ${relacion}`
}

ESTADOS.resumen = { sin_resumen: ["Sin resumen", "peligro"], pendiente: ["Pendiente", "advertencia"], aprobado: ["Aprobado", "exito"] }
ESTADOS.variable = { pendiente: ["Pendiente", "advertencia"], aprobada: ["Aprobada", "exito"] }
TEXTOS.fuenteRegistro = { manual: "Manual", asistencia: "Desde asistencia", importacion: "Importación" }

// Carga trabajadores y personas de la empresa de trabajo y arma los textos para mostrar y buscar.
async function trabajadoresDeLaEmpresa() {
    const listas = await cargarListas(["/api/trabajadores", "/api/personas"])
    if (!listas) {
        return null
    }
    const personaPorId = porId(listas[1])
    const trabajadores = deEmpresaActual(listas[0]).map((t) => {
        const persona = personaPorId.get(t.persona_id)
        return {
            ...t,
            persona,
            nombre: nombreCompleto(persona) || `Trabajador ${t.id}`,
            rut: persona ? formatearRut(persona.rut, persona.dv) : "",
            textoBuscador: textoTrabajador(t, persona)
        }
    })
    return { trabajadores, porId: porId(trabajadores) }
}

// Ejecuta una acción para varios registros, de a uno, y devuelve los errores con nombre.
async function enLote(registros, accion, nombreDe) {
    const errores = []
    let hechos = 0
    for (const registro of registros) {
        const resultado = await accion(registro)
        if (resultado.status === 200) {
            hechos++
        } else {
            errores.push({ nombre: nombreDe(registro), motivos: [resultado.datos?.error ?? "Error"] })
        }
    }
    return { hechos, errores }
}

// ---------- Jornadas (copia de src/contratos/jornada_legal.js) ----------

const NOMBRES_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

function minutosDeHora(hora) {
    const coincidencia = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hora ?? ""))
    return coincidencia ? Number(coincidencia[1]) * 60 + Number(coincidencia[2]) : null
}

function horasDelDia(dia) {
    if (!dia?.trabaja) {
        return 0
    }
    const inicio = minutosDeHora(dia.entrada)
    const fin = minutosDeHora(dia.salida)
    if (inicio === null || fin === null || fin <= inicio) {
        return 0
    }
    return Math.round(((fin - inicio - Number(dia.colacion ?? 0)) / 60) * 100) / 100
}

function textoDistribucion(dias) {
    const grupos = []
    for (const d of (dias ?? []).filter((x) => x.trabaja)) {
        const ultimo = grupos[grupos.length - 1]
        if (ultimo && ultimo.hasta === d.dia - 1 && ultimo.entrada === d.entrada && ultimo.salida === d.salida && ultimo.colacion === d.colacion) {
            ultimo.hasta = d.dia
        } else {
            grupos.push({ desde: d.dia, hasta: d.dia, entrada: d.entrada, salida: d.salida, colacion: d.colacion })
        }
    }
    if (grupos.length === 0) {
        return ""
    }
    const hora = (h) => h.replace(/^0/, "")
    const tramos = grupos.map((g) => `${g.desde === g.hasta ? NOMBRES_DIA[g.desde - 1] : `${NOMBRES_DIA[g.desde - 1]} a ${NOMBRES_DIA[g.hasta - 1]}`} de ${hora(g.entrada)} a ${hora(g.salida)}`)
    const colaciones = [...new Set(grupos.map((g) => g.colacion))]
    const texto = `${tramos.join("; ")}${colaciones.length === 1 ? ` · colación ${colaciones[0]} min` : ""}`
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Anula un contrato con la firma pendiente. Pide el motivo y devuelve true si se anuló.
async function anularContratoConMotivo(id) {
    const motivo = prompt(`Anular el contrato #${id}.\n\nÚsalo solo si el contrato no debió existir (por ejemplo, el trabajador no se presentó). Si era su único contrato, el trabajador vuelve a postulante.\n\nMotivo de la anulación:`)
    if (motivo === null) {
        return false
    }
    const resultado = await llamarApi(`/api/contratos/${id}/anular`, { method: "PATCH", body: JSON.stringify({ motivo: motivo.trim() }) })
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo anular el contrato")
        return false
    }
    mensaje("info", `Contrato #${id} anulado.`)
    return true
}
