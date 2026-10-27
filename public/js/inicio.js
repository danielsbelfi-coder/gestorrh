const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
    "Septiembre", "Octubre", "Noviembre", "Diciembre"]

function saludar(usuario) {
    const hora = new Date().getHours()
    const momento = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches"
    const nombre = String(usuario.nombre ?? "").trim().split(/\s+/)[0]
    document.getElementById("saludo").textContent = nombre ? `${momento}, ${nombre}` : momento
}

async function cargarPeriodosAbiertos() {
    const contenedor = document.getElementById("periodosAbiertos")
    const [periodos, empresas] = await Promise.all([
        llamarApi("/api/periodos-remuneracion"),
        llamarApi("/api/empresas")
    ])

    if (periodos.status !== 200) {
        contenedor.textContent = periodos.datos?.error ?? "No se pudieron cargar los periodos"
        return
    }

    const nombreEmpresa = {}
    if (empresas.status === 200) {
        for (const empresa of empresas.datos) {
            nombreEmpresa[empresa.id] = empresa.nombre_fantasia || empresa.razon_social
        }
    }

    const abiertos = periodos.datos
        .filter((periodo) => periodo.estado === "abierto")
        .sort((a, b) => a.anio - b.anio || a.mes - b.mes)

    if (abiertos.length === 0) {
        contenedor.innerHTML = 'No hay periodos abiertos. <a href="periodos.html">Abrir un periodo</a>'
        return
    }

    contenedor.classList.remove("texto-suave")
    contenedor.innerHTML = `
        <table>
            <thead><tr><th>Empresa</th><th>Periodo</th><th>Estado</th><th></th></tr></thead>
            <tbody>${abiertos.map((periodo) => `
                <tr>
                    <td>${escaparHtml(nombreEmpresa[periodo.empresa_id] ?? "Empresa " + periodo.empresa_id)}</td>
                    <td>${escaparHtml(NOMBRES_MES[periodo.mes - 1] + " " + periodo.anio)}</td>
                    <td><span class="insignia exito">Abierto</span></td>
                    <td class="numero"><a href="liquidaciones.html">Ir a liquidaciones</a></td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

document.addEventListener("usuario-listo", function (evento) {
    saludar(evento.detail)
    cargarPeriodosAbiertos()
})
