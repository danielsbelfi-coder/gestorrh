// El PDF, el LRE y Previred deben mostrar la AFP y la salud con que se calculó cada liquidación,
// no las actuales de la persona (que pueden haber cambiado después). Esta función reemplaza, en las
// liquidaciones ya leídas (con Trabajador → Persona → Afp e Isapre), los datos de la persona por los guardados.
// Las liquidaciones antiguas, sin esos datos guardados, se dejan como están (usan los de la persona).
const { Afp, Isapre } = require("../shared/associations.js")

function fijar(persona, campo, valor) {
    persona.setDataValue(campo, valor)
    persona[campo] = valor
}

async function aplicarPrevisionGuardada(liquidaciones) {
    const lista = (Array.isArray(liquidaciones) ? liquidaciones : [liquidaciones])
        .filter((liquidacion) => liquidacion?.detalle_calculo?.afp && liquidacion.Trabajador?.Persona)

    if (lista.length === 0) {
        return
    }

    // Sin AFP (técnico extranjero): id nulo.
    const idsAfp = [...new Set(lista.map((liquidacion) => liquidacion.detalle_calculo.afp.id).filter(Boolean))]
    const idsIsapre = [...new Set(lista.map((liquidacion) => liquidacion.detalle_calculo.salud?.isapre_id).filter(Boolean))]
    const afps = new Map((idsAfp.length ? await Afp.findAll({ where: { id: idsAfp } }) : []).map((afp) => [afp.id, afp]))
    const isapres = new Map((idsIsapre.length ? await Isapre.findAll({ where: { id: idsIsapre } }) : []).map((isapre) => [isapre.id, isapre]))

    for (const liquidacion of lista) {
        const { afp, salud } = liquidacion.detalle_calculo
        const persona = liquidacion.Trabajador.Persona
        fijar(persona, "Afp", afps.get(afp.id) ?? null)
        fijar(persona, "sistema_salud", salud?.sistema ?? null)
        fijar(persona, "Isapre", salud?.sistema === "Isapre" ? isapres.get(salud.isapre_id) ?? null : null)
        fijar(persona, "plan_isapre_uf", salud?.sistema === "Isapre" ? salud.planUF ?? null : null)
    }
}

module.exports = { aplicarPrevisionGuardada }
