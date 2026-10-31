// Pura: arma la nómina bancaria (filas para el archivo y excluidos con su motivo). Ver «Nómina bancaria» en el SPEC.
const { BANCOS, motivoSinTransferencia } = require("../shared/bancos.js")

const nombreDe = (persona) => [persona.nombres, persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(" ")

// items: [{ trabajador_id, persona, monto, glosa, motivo? }]. motivo (por ejemplo, «borrador») excluye de inmediato.
function armarNomina(items) {
    const filas = []
    const excluidas = []
    for (const item of items) {
        const persona = item.persona
        const base = { trabajador_id: item.trabajador_id, rut: `${persona.rut}-${String(persona.dv).toUpperCase()}`, nombre: nombreDe(persona), monto: Math.round(Number(item.monto)) }
        const motivo = item.motivo ?? (base.monto <= 0 ? "Monto en $0" : motivoSinTransferencia(persona))
        if (motivo) {
            excluidas.push({ ...base, motivo })
            continue
        }
        filas.push({
            ...base,
            banco_codigo: persona.banco_codigo,
            banco: BANCOS[persona.banco_codigo],
            tipo_cuenta: persona.tipo_cuenta,
            numero_cuenta: String(persona.numero_cuenta).trim(),
            email: persona.email ?? "",
            glosa: item.glosa
        })
    }
    const orden = (a, b) => a.nombre.localeCompare(b.nombre, "es")
    return { filas: filas.sort(orden), excluidas: excluidas.sort(orden), total: filas.reduce((suma, f) => suma + f.monto, 0) }
}

module.exports = { armarNomina }
