// X-Empresa para los usuarios de clientes: cada petición se limita a la empresa elegida en la barra, salvo las
// pantallas que trabajan con varias empresas. Ver «X-Empresa para todos los usuarios» en el SPEC. Función pura.
const { rutaDePlataforma } = require("../soporte/acceso_soporte.js")

// Rutas que trabajan con todas las empresas del usuario (o con ninguna): no se limitan.
const PREFIJOS_VARIAS_EMPRESAS = ["/api/empresas", "/api/pendientes", "/api/cuenta", "/api/cuentas", "/api/planes"]

function rutaDeVariasEmpresas(url) {
    const ruta = String(url ?? "").split("?")[0]
    return rutaDePlataforma(url) || PREFIJOS_VARIAS_EMPRESAS.some((prefijo) => ruta === prefijo || ruta.startsWith(`${prefijo}/`))
}

// cabecera: valor de X-Empresa (o undefined); empresas: ids que el usuario puede ver.
// → { empresas } con las que sigue la petición, o { error: "empresa_no_permitida" }.
function resolverEmpresaCliente(cabecera, empresas, url) {
    if (cabecera === undefined || cabecera === null || String(cabecera).trim() === "" || rutaDeVariasEmpresas(url)) {
        return { empresas }
    }
    const texto = String(cabecera).trim()
    const id = /^\d{1,10}$/.test(texto) ? Number(texto) : NaN
    if (!empresas.includes(id)) {
        return { error: "empresa_no_permitida" }
    }
    return { empresas: [id] }
}

module.exports = { PREFIJOS_VARIAS_EMPRESAS, rutaDeVariasEmpresas, resolverEmpresaCliente }
