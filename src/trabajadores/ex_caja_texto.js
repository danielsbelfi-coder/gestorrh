// Paquete AH: la ex-caja del IPS escrita en una planilla. Función pura, sin base de datos.
// Se acepta «Empart régimen 1» (como sale en la lista desplegable), «Empart 1», «empart r1» o el código Previred de
// 4 dígitos (0101). No importan mayúsculas, tildes ni puntuación.

function nombreExCaja(exCaja) {
    return `${exCaja.caja} régimen ${exCaja.regimen}`
}

function claveExCaja(texto) {
    return String(texto ?? "")
        .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/\b(regimen|reg|r)\.?\s*(?=\d)/g, " ")
        .replace(/[^a-z0-9]+/g, "")
}

// { item } o { motivo }.
function resolverExCaja(lista, valor) {
    const escrito = String(valor ?? "").trim()
    const porCodigo = /^\d{4}$/.test(escrito) ? lista.filter((c) => c.codigo_previred === escrito) : []
    const buscado = claveExCaja(escrito)
    const encontrados = porCodigo.length > 0 ? porCodigo : lista.filter((c) => claveExCaja(nombreExCaja(c)) === buscado)
    if (encontrados.length === 1) {
        return { item: encontrados[0] }
    }
    return { motivo: `la ex-caja "${escrito}" no existe: elígela de la lista (por ejemplo, «Empart régimen 1») o escribe su código Previred de 4 dígitos` }
}

module.exports = { nombreExCaja, claveExCaja, resolverExCaja }
