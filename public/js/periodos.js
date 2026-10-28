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
            titulo: "Reaperturas", orden: false, valor: (p) => String(p.reaperturas?.length ?? 0),
            html: (p) => p.reaperturas?.length
                ? `<details class="reaperturas-detalle"><summary>${p.reaperturas.length} reapertura(s)</summary><ul>${p.reaperturas.map((r) =>
                    `<li>${escaparHtml(fechaCorta(r.createdAt))} · ${escaparHtml(r.usuario?.nombre ?? "")}: ${escaparHtml(r.motivo)}</li>`).join("")}</ul></details>`
                : ""
        },
        {
            titulo: "", orden: false, valor: () => "",
            html: (p) => p.estado === "abierto"
                ? `<a class="boton secundario chico" href="liquidaciones.html?periodo=${p.id}">Liquidaciones</a>
                   <button type="button" class="chico" data-cerrar="${p.id}">Cerrar periodo</button>`
                : `<button type="button" class="chico secundario" data-reabrir="${p.id}">Reabrir</button>`
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
    periodosCargados = deEmpresaActual(listas[0]).sort((a, b) => b.anio - a.anio || b.mes - a.mes)
    tabla.mostrar(periodosCargados)
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

// ---- Ventanas de confirmación ----

let periodosCargados = []

function periodoPorId(id) {
    return periodosCargados.find((p) => String(p.id) === String(id))
}

function textoDelPeriodo(periodo) {
    return `${String(periodo.mes).padStart(2, "0")}/${periodo.anio}`
}

// Muestra una ventana. Cada botón es { texto, clase, accion, requiere } (requiere: función que dice si ya se puede pulsar).
function abrirModal({ tipo, titulo, cuerpo, botones }) {
    const fondo = document.createElement("div")
    fondo.className = "modal-fondo"
    fondo.setAttribute("role", "dialog")
    fondo.setAttribute("aria-modal", "true")

    const ventana = document.createElement("div")
    ventana.className = `modal ${tipo}`
    ventana.innerHTML = `<h2>${escaparHtml(titulo)}</h2>${cuerpo}<div class="modal-botones"></div>`
    fondo.appendChild(ventana)

    const cerrar = () => {
        fondo.remove()
        document.removeEventListener("keydown", alTeclear)
    }
    const alTeclear = (evento) => {
        if (evento.key === "Escape") {
            cerrar()
        }
    }
    document.addEventListener("keydown", alTeclear)

    const contenedor = ventana.querySelector(".modal-botones")
    const habilitables = []

    for (const definicion of botones) {
        const boton = document.createElement("button")
        boton.type = "button"
        boton.textContent = definicion.texto
        if (definicion.clase) {
            boton.className = definicion.clase
        }
        boton.addEventListener("click", async () => {
            cerrar()
            if (definicion.accion) {
                await definicion.accion(ventana)
            }
        })
        contenedor.appendChild(boton)
        if (definicion.requiere) {
            habilitables.push({ boton, requiere: definicion.requiere })
        }
    }

    const actualizar = () => {
        for (const { boton, requiere } of habilitables) {
            boton.disabled = !requiere(ventana)
        }
    }
    ventana.addEventListener("input", actualizar)
    actualizar()

    document.body.appendChild(fondo)
    ventana.querySelector("input, textarea, button")?.focus()
}

async function pedirCierre(id) {
    const periodo = periodoPorId(id)
    const revision = await llamarApi(`/api/periodos-remuneracion/${id}/revision-cierre`)

    if (revision.status !== 200) {
        mensaje("error", revision.datos?.error ?? "No se pudo revisar el periodo")
        return
    }

    const texto = textoDelPeriodo(periodo)
    const problemas = revision.datos.problemas

    if (problemas.length > 0) {
        abrirModal({
            tipo: "info",
            titulo: `Aún no se puede cerrar ${texto}`,
            cuerpo: `<p>Estos trabajadores tienen pendientes. Resuélvelos y vuelve a intentar:</p>
                <ul>${problemas.map((p) => `<li><strong>${escaparHtml(p.nombre)}:</strong> ${escaparHtml(p.motivos.join("; "))}</li>`).join("")}</ul>`,
            botones: [{ texto: "Entendido" }]
        })
        return
    }

    abrirModal({
        tipo: "peligro",
        titulo: `Cerrar el periodo ${texto}`,
        cuerpo: `<div class="modal-aviso"><strong>Atención:</strong> al cerrar, este mes queda bloqueado.</div>
            <p>Después de cerrar <strong>no podrás</strong>:</p>
            <ul>
                <li>registrar ni aprobar marcas de asistencia, resúmenes ni variables de este mes;</li>
                <li>calcular, recalcular ni emitir liquidaciones de este mes;</li>
                <li>calcular ni emitir finiquitos de trabajadores que terminan en este mes.</li>
            </ul>
            <p>Solo un ADMIN podrá reabrirlo, en caso de emergencia, con un motivo que queda registrado.</p>
            <label for="confirmaMes">Para confirmar, escribe el mes: <strong>${escaparHtml(texto)}</strong></label>
            <input type="text" id="confirmaMes" autocomplete="off" placeholder="${escaparHtml(texto)}">`,
        botones: [
            { texto: "Cancelar", clase: "secundario" },
            {
                texto: "Cerrar periodo", clase: "peligro",
                requiere: (ventana) => ventana.querySelector("#confirmaMes").value.trim() === texto,
                accion: () => cerrarPeriodo(id)
            }
        ]
    })
}

async function cerrarPeriodo(id) {
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
}

function pedirReapertura(id) {
    const periodo = periodoPorId(id)
    const texto = textoDelPeriodo(periodo)

    abrirModal({
        tipo: "peligro",
        titulo: `Reabrir el periodo ${texto}`,
        cuerpo: `<div class="modal-aviso"><strong>Solo para emergencias.</strong> Reabrir un mes ya cerrado puede dejar distintos los datos que ya se usaron en otros documentos.</div>
            <ul>
                <li>Si este mes ya se declaró en Previred o en la Dirección del Trabajo, corregirlo exige rectificar esa declaración fuera del sistema.</li>
                <li>Las liquidaciones ya emitidas siguen emitidas: para corregir una, recalcúlala (se crea una versión nueva).</li>
                <li>Si un trabajador terminó este mes y su finiquito no estaba emitido, podrá calcularse y emitirse.</li>
                <li>Solo se puede reabrir el último periodo cerrado, y solo si los meses siguientes no tienen liquidaciones emitidas.</li>
                <li>Quedará registrado quién reabrió, cuándo y por qué.</li>
            </ul>
            <label for="motivoReapertura">Motivo de la reapertura</label>
            <textarea id="motivoReapertura" maxlength="500" placeholder="Ej.: se omitió un bono de producción de octubre"></textarea>
            <div class="modal-ayuda">Mínimo 10 caracteres.</div>`,
        botones: [
            { texto: "Cancelar", clase: "secundario" },
            {
                texto: "Reabrir periodo", clase: "peligro",
                requiere: (ventana) => ventana.querySelector("#motivoReapertura").value.trim().length >= 10,
                accion: (ventana) => reabrirPeriodo(id, ventana.querySelector("#motivoReapertura").value.trim())
            }
        ]
    })
}

async function reabrirPeriodo(id, motivo) {
    limpiarMensajes()
    const resultado = await llamarApi(`/api/periodos-remuneracion/${id}/reabrir`, {
        method: "PATCH",
        body: JSON.stringify({ motivo })
    })

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo reabrir el periodo")
        return
    }

    mensaje("info", "Periodo reabierto. Quedó registrado el motivo.")
    cargarPeriodos()
}

document.getElementById("tablaPeriodos").addEventListener("click", function (evento) {
    const cerrar = evento.target.closest("[data-cerrar]")?.dataset.cerrar
    if (cerrar) {
        limpiarMensajes()
        pedirCierre(cerrar)
        return
    }

    const reabrir = evento.target.closest("[data-reabrir]")?.dataset.reabrir
    if (reabrir) {
        limpiarMensajes()
        pedirReapertura(reabrir)
    }
})

document.addEventListener("empresa-lista", cargarPeriodos)
