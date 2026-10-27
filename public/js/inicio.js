function saludar(usuario) {
    const hora = new Date().getHours()
    const momento = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches"
    const nombre = String(usuario.nombre ?? "").trim().split(/\s+/)[0]
    document.getElementById("saludo").textContent = nombre ? `${momento}, ${nombre}` : momento
}

async function cargarPeriodosAbiertos() {
    const contenedor = document.getElementById("periodosAbiertos")
    const periodos = await llamarApi("/api/periodos-remuneracion")

    if (periodos.status !== 200) {
        contenedor.textContent = periodos.datos?.error ?? "No se pudieron cargar los periodos"
        return
    }

    const abiertos = deEmpresaActual(periodos.datos)
        .filter((periodo) => periodo.estado === "abierto")
        .sort((a, b) => a.anio - b.anio || a.mes - b.mes)

    if (abiertos.length === 0) {
        contenedor.classList.add("texto-suave")
        contenedor.innerHTML = 'No hay periodos abiertos en esta empresa. <a href="periodos.html">Abrir un periodo</a>'
        return
    }

    contenedor.classList.remove("texto-suave")
    contenedor.innerHTML = `
        <table>
            <thead><tr><th>Periodo</th><th></th></tr></thead>
            <tbody>${abiertos.map((periodo) => `
                <tr>
                    <td>${escaparHtml(nombrePeriodo(periodo))}</td>
                    <td class="numero"><a href="liquidaciones.html?periodo=${periodo.id}">Ir a liquidaciones</a></td>
                </tr>`).join("")}
            </tbody>
        </table>`
}

document.addEventListener("usuario-listo", (evento) => saludar(evento.detail))
document.addEventListener("empresa-lista", cargarPeriodosAbiertos)
