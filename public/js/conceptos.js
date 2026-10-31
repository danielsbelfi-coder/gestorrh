requiereLogin()

const TIPOS = { haber: "Haber", descuento: "Descuento", aporte_empleador: "Aporte del empleador" }
let conceptos = []

const siNo = (valor) => (valor ? "Sí" : "No")

const tabla = crearTabla({
    contenedor: "tablaConceptos",
    textoBuscar: "Buscar por código, nombre o código LRE…",
    vacio: "No hay conceptos.",
    columnas: [
        { titulo: "Código", valor: (c) => c.codigo },
        { titulo: "Nombre", valor: (c) => c.nombre },
        { titulo: "Tipo", valor: (c) => TIPOS[c.tipo] ?? c.tipo },
        { titulo: "Imponible", valor: (c) => siNo(c.imponible) },
        { titulo: "Tributable", valor: (c) => siNo(c.tributable) },
        { titulo: "Base grat.", valor: (c) => siNo(c.base_gratificacion) },
        { titulo: "15 % art. 58", valor: (c) => (c.tipo === "descuento" ? siNo(c.limite_art58) : "—") },
        {
            titulo: "Código LRE", valor: (c) => c.codigo_lre ?? "",
            html: (c) => c.codigo_lre ? escaparHtml(c.codigo_lre) : (c.tipo === "aporte_empleador" ? "—" : `<span class="insignia peligro">Falta</span>`)
        },
        { titulo: "Origen", valor: (c) => (c.empresa_id === null ? "Común" : "Empresa") },
        { titulo: "Estado", valor: (c) => (c.activo === false ? "Inactivo" : "Activo"), html: (c) => c.activo === false ? `<span class="insignia">Inactivo</span>` : `<span class="insignia exito">Activo</span>` },
        { titulo: "", orden: false, valor: () => "", html: botones }
    ],
    filtros: [
        { titulo: "Tipo", valor: (c) => c.tipo, opciones: Object.entries(TIPOS) },
        { titulo: "Origen", valor: (c) => (c.empresa_id === null ? "comun" : "empresa"), opciones: [["comun", "Común"], ["empresa", "De la empresa"]] }
    ]
})

function botones(c) {
    if (c.empresa_id === null) {
        return ""
    }
    return `<button type="button" class="chico secundario" data-accion="lre" data-id="${c.id}">Código LRE</button>
        ${c.tipo === "descuento" ? `<button type="button" class="chico secundario" data-accion="art58" data-id="${c.id}">${c.limite_art58 ? "Quitar del 15 %" : "Contar en el 15 %"}</button>` : ""}
        ${c.activo === false
            ? `<button type="button" class="chico" data-accion="reactivar" data-id="${c.id}">Reactivar</button>`
            : `<button type="button" class="chico secundario" data-accion="desactivar" data-id="${c.id}">Desactivar</button>`}`
}

async function cargarConceptos() {
    const resultado = await llamarApi(`/api/conceptos?empresa_id=${empresaActual()}`)
    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudieron cargar los conceptos")
        return
    }
    conceptos = resultado.datos
    tabla.mostrar(conceptos)
}

function mostrarCasillasHaber() {
    const esHaber = document.getElementById("tipo").value === "haber"
    document.querySelectorAll(".solo-haber").forEach((casilla) => { casilla.hidden = !esHaber })
    document.querySelectorAll(".solo-descuento").forEach((casilla) => { casilla.hidden = esHaber })
}
document.getElementById("tipo").addEventListener("change", mostrarCasillasHaber)
mostrarCasillasHaber()

document.getElementById("formConcepto").addEventListener("submit", async function (evento) {
    evento.preventDefault()
    if (exigirEmpresaActual() === null) {
        return
    }
    const lre = document.getElementById("codigoLre").value
    const creado = await crearRegistro("/api/conceptos", {
        empresa_id: empresaActual(),
        codigo: document.getElementById("codigo").value.trim().toUpperCase(),
        nombre: document.getElementById("nombre").value.trim(),
        tipo: document.getElementById("tipo").value,
        codigo_lre: lre === "" ? null : Number(lre),
        imponible: document.getElementById("imponible").checked,
        tributable: document.getElementById("tributable").checked,
        base_gratificacion: document.getElementById("baseGratificacion").checked,
        limite_art58: document.getElementById("limiteArt58").checked
    }, "Concepto creado.")
    if (creado) {
        cerrarPanelCrear(this)
        mostrarCasillasHaber()
        cargarConceptos()
    }
})

document.getElementById("tablaConceptos").addEventListener("click", async function (evento) {
    const boton = evento.target.closest("[data-accion]")
    if (!boton) {
        return
    }
    const concepto = conceptos.find((c) => String(c.id) === boton.dataset.id)
    limpiarMensajes()

    let resultado
    if (boton.dataset.accion === "lre") {
        const valor = prompt(`Código LRE de "${concepto.nombre}" (${concepto.tipo === "haber" ? "2xxx" : "3xxx"}):`, concepto.codigo_lre ?? "")
        if (valor === null) {
            return
        }
        resultado = await llamarApi(`/api/conceptos/${concepto.id}/codigo-lre`, {
            method: "PATCH",
            body: JSON.stringify({ codigo_lre: valor.trim() === "" ? null : Number(valor) })
        })
    } else if (boton.dataset.accion === "art58") {
        resultado = await llamarApi(`/api/conceptos/${concepto.id}/art58`, { method: "PATCH", body: JSON.stringify({ limite_art58: !concepto.limite_art58 }) })
    } else {
        resultado = await llamarApi(`/api/conceptos/${concepto.id}/${boton.dataset.accion}`, { method: "PATCH" })
    }

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo completar la acción")
        return
    }
    mensaje("info", "Concepto actualizado.")
    cargarConceptos()
})

document.addEventListener("empresa-lista", () => { limpiarMensajes(); cargarConceptos() })
