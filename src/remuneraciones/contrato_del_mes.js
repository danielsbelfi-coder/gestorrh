function ordenarPorVigencia(anexos) {
    return [...anexos].sort((a, b) => a.fecha_vigencia.localeCompare(b.fecha_vigencia) || a.id - b.id)
}

function valorEn(campo, fecha, anexos, valorActual) {
    const delCampo = ordenarPorVigencia(anexos.filter((anexo) => anexo.campo_modificado === campo))

    if (delCampo.length === 0) {
        return valorActual
    }

    const vigentes = delCampo.filter((anexo) => anexo.fecha_vigencia <= fecha)

    return vigentes.length > 0 ? vigentes[vigentes.length - 1].valor_nuevo : delCampo[0].valor_anterior
}

function contratoDelMes({ contrato, anexos, anio, mes }) {
    const mm = String(mes).padStart(2, "0")
    const primerDia = `${anio}-${mm}-01`
    const ultimoDia = `${anio}-${mm}-${new Date(Date.UTC(anio, mes, 0)).getUTCDate()}`
    const firmados = anexos.filter((anexo) => anexo.estado_firma === "firmado")

    const delMes = { ...contrato }
    for (const campo of new Set(firmados.map((anexo) => anexo.campo_modificado))) {
        delMes[campo] = valorEn(campo, ultimoDia, firmados, contrato[campo])
    }

    const cambiosSueldo = [...new Set(firmados
        .filter((anexo) => anexo.campo_modificado === "sueldo_base" && anexo.fecha_vigencia > primerDia && anexo.fecha_vigencia <= ultimoDia)
        .map((anexo) => anexo.fecha_vigencia))].sort()

    const tramosSueldo = [{ desdeDia: 1, sueldo: Number(valorEn("sueldo_base", primerDia, firmados, contrato.sueldo_base)) }]
    for (const fecha of cambiosSueldo) {
        tramosSueldo.push({ desdeDia: Number(fecha.slice(8, 10)), sueldo: Number(valorEn("sueldo_base", fecha, firmados, contrato.sueldo_base)) })
    }

    return { contrato: delMes, tramosSueldo }
}

module.exports = {
    contratoDelMes
}