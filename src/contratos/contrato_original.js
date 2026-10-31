// El contrato firmado es inamovible: sus cambios constan en anexos. La fila del contrato guarda las condiciones
// vigentes (para el cálculo), así que el documento del contrato se arma con los valores originales, que son el
// valor anterior del primer anexo firmado de cada campo. Funciones puras.

function ordenFirma(a, b) {
    return String(a.fecha_firma ?? "").localeCompare(String(b.fecha_firma ?? "")) || a.id - b.id
}

function contratoOriginal(contrato, anexos) {
    const original = { ...contrato }
    const firmados = anexos.filter((anexo) => anexo.estado_firma === "firmado").sort(ordenFirma)
    const vistos = new Set()
    for (const anexo of firmados) {
        if (!vistos.has(anexo.campo_modificado)) {
            vistos.add(anexo.campo_modificado)
            original[anexo.campo_modificado] = anexo.valor_anterior
        }
    }
    return original
}

// Un contrato que pasó a indefinido por anexo ya no tiene fecha de término vigente (la del plazo fijo queda en el original).
function fechaTerminoVigente(contrato) {
    return contrato.tipo_contrato === "indefinido" ? null : contrato.fecha_termino ?? null
}

module.exports = { contratoOriginal, fechaTerminoVigente }
