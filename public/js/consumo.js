requiereLogin()

// El comercial ve el consumo de cualquier cuenta con consumo.html?cuenta=ID (la misma pantalla que ve el cliente).
const cuentaId = new URLSearchParams(location.search).get("cuenta")
if (cuentaId) {
    document.querySelector("main.contenido").dataset.menu = "cuentas.html"
}

function barraUso(titulo, uso, nota) {
    if (uso.limite === null) {
        return `<div class="uso"><div class="uso-titulo">${escaparHtml(titulo)}</div><div class="uso-cifra">${escaparHtml(uso.usados)}</div></div>`
    }
    const porcentaje = uso.limite > 0 ? Math.min(100, Math.round((uso.usados / uso.limite) * 100)) : 100
    const clase = uso.usados >= uso.limite ? "lleno" : porcentaje >= 80 ? "alto" : ""
    return `
        <div class="uso">
            <div class="uso-titulo">${escaparHtml(titulo)} <span class="texto-suave">${escaparHtml(nota)}</span></div>
            <div class="uso-cifra">${escaparHtml(uso.usados)} <span class="texto-suave">de ${escaparHtml(uso.limite)}</span></div>
            <div class="uso-barra"><span class="${clase}" style="width: ${porcentaje}%"></span></div>
        </div>`
}

function uf(valor) {
    return `${Number(valor).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} UF`
}

function filaPrecio(texto, valor, clase = "") {
    return `<tr class="${clase}"><td>${escaparHtml(texto)}</td><td class="numero">${escaparHtml(valor)}</td></tr>`
}

async function cargarConsumo() {
    limpiarMensajes()
    const anio = Number(document.getElementById("anio").value)
    const mes = Number(document.getElementById("mes").value)
    const ruta = cuentaId ? `/api/cuentas/${cuentaId}/consumo` : "/api/cuenta/consumo"
    const resultado = await llamarApi(`${ruta}?anio=${anio}&mes=${mes}`)

    if (resultado.status !== 200) {
        mensaje("error", resultado.datos?.error ?? "No se pudo cargar el consumo")
        return
    }
    const consumo = resultado.datos

    document.getElementById("nombrePlan").textContent = consumo.plan_visible ?? consumo.plan ?? "sin asignar"
    document.getElementById("usoPlan").innerHTML = consumo.plan === null
        ? `<p class="texto-suave">La cuenta no tiene un plan asignado. Contacta a tu ejecutivo comercial.</p>`
        : barraUso("Trabajadores del mes", consumo.trabajadores, "(contratados al menos un día del mes)")
            + barraUso("Usuarios activos", consumo.usuarios, "(a la fecha, incluye los adicionales)")

    const avisos = []
    if (consumo.plan !== null && consumo.trabajadores.usados >= consumo.trabajadores.limite) {
        avisos.push("Alcanzaste el límite de trabajadores del plan para este mes.")
    }
    if (consumo.plan !== null && consumo.usuarios.usados >= consumo.usuarios.limite) {
        avisos.push("Alcanzaste el límite de usuarios del plan.")
    }
    if (avisos.length > 0) {
        mensaje("error", cuentaId ? avisos.join(" ") : `${avisos.join(" ")} Para ampliarlo, contacta a tu ejecutivo comercial.`)
    }

    const p = consumo.precio
    document.getElementById("precioPlan").innerHTML = !p
        ? `<p class="texto-suave">Sin plan asignado.</p>`
        : `<table class="tabla-precio"><tbody>
            ${filaPrecio("Plan", uf(p.plan_uf))}
            ${p.usuarios_adicionales > 0 ? filaPrecio(`Usuarios adicionales (${p.usuarios_adicionales} × ${uf(p.usuario_adicional_uf)})`, uf(p.adicionales_uf)) : ""}
            ${filaPrecio("Neto", uf(p.neto_uf))}
            ${filaPrecio("IVA (19%)", uf(p.iva_uf))}
            ${filaPrecio("Total mensual", uf(p.total_uf), "total")}
            ${p.total_pesos !== null ? filaPrecio(`Aproximado en pesos (UF ${pesos(p.valor_uf)})`, pesos(p.total_pesos)) : ""}
        </tbody></table>
        <p class="texto-suave nota-ficha">El cobro se hace en UF; el monto en pesos es referencial y usa la UF del mes consultado.${p.total_pesos === null ? " Este mes todavía no tiene UF cargada." : ""}</p>`
}

llenarSelect(document.getElementById("mes"), NOMBRES_MES.map((nombre, i) => ({ id: i + 1, texto: nombre })))
const hoy = new Date()
document.getElementById("mes").value = hoy.getMonth() + 1
document.getElementById("anio").value = hoy.getFullYear()
document.getElementById("mes").addEventListener("change", cargarConsumo)
document.getElementById("anio").addEventListener("change", cargarConsumo)

async function mostrarCuenta() {
    if (!cuentaId) {
        return
    }
    document.getElementById("volverCuentas").hidden = false
    const resultado = await llamarApi("/api/cuentas")
    const cuenta = resultado.status === 200 ? resultado.datos.find((c) => String(c.id) === cuentaId) : null
    document.querySelector("h1").textContent = cuenta ? `Consumo de ${cuenta.nombre}` : `Consumo de la cuenta ${cuentaId}`
}

document.addEventListener("usuario-listo", function () {
    mostrarCuenta()
    cargarConsumo()
})
