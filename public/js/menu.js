async function mostrarMenu() {
    let enlacesAdmin = ""

    const resultado = await llamarApi("/api/auth/usuario")

    if (resultado.status === 200 && resultado.datos.rol_plataforma === "comercial") {
        document.getElementById("menu").innerHTML = `
        <nav>
            <a href="cuentas.html">Cuentas</a> |
            <a href="cambiar-password.html">Cambiar contraseña</a>
        </nav>
        `
        return
    }

    if (resultado.status === 200 && resultado.datos.es_admin_cuenta === true) {
        enlacesAdmin = ` | <a href="usuarios.html">Usuarios</a> | <a href="consumo.html">Consumo del plan</a>`
    }

    document.getElementById("menu").innerHTML = `
    <nav>
        <a href="empresas.html">Empresas</a> |
        <a href="trabajadores.html">Trabajadores</a> |
        <a href="personas.html">Personas</a> |
        <a href="contratos.html">Contratos</a> |
        <a href="cargos.html">Cargos</a> |
        <a href="periodos.html">Periodos</a> |
        <a href="asistencias.html">Asistencias</a> |
        <a href="liquidaciones.html">Liquidaciones</a>${enlacesAdmin} |
        <a href="cambiar-password.html">Cambiar contraseña</a>
    </nav>
    `
}

mostrarMenu()