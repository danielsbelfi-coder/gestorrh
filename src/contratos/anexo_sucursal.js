// Anexo de cambio de sucursal (funciones puras). Ver «Casa matriz y sucursales» en el SPEC.
// Es el único anexo que cambia tres campos a la vez: sucursal, lugar y comuna de prestación. Guarda los tres en
// valor_anterior y valor_nuevo como JSON. Para el cálculo del mes y el contrato original se «expande» en tres anexos
// de un campo cada uno, así el resto del sistema sigue trabajando campo por campo.

const CAMPO_SUCURSAL = "sucursal"
const CAMPOS_LUGAR = ["sucursal_id", "lugar_prestacion_servicios", "comuna_prestacion"]

// Texto JSON con el lugar de un contrato (o de un lugar calculado con lugarDeSucursal / lugarDeCasaMatriz).
function valorLugar(origen) {
    return JSON.stringify({
        sucursal_id: origen.sucursal_id === null || origen.sucursal_id === undefined ? null : Number(origen.sucursal_id),
        lugar_prestacion_servicios: origen.lugar_prestacion_servicios ?? null,
        comuna_prestacion: origen.comuna_prestacion ?? null
    })
}

// Lee el JSON de un anexo de sucursal. Devuelve null si no se puede leer.
function leerValorLugar(valor) {
    if (typeof valor !== "string") {
        return null
    }
    try {
        const lugar = JSON.parse(valor)
        return lugar && typeof lugar === "object" ? lugar : null
    } catch {
        return null
    }
}

// Reemplaza cada anexo de sucursal por tres anexos de un campo (mismo id, fechas y estado).
function expandirAnexos(anexos) {
    return anexos.flatMap((anexo) => {
        if (anexo.campo_modificado !== CAMPO_SUCURSAL) {
            return [anexo]
        }
        const antes = leerValorLugar(anexo.valor_anterior) ?? {}
        const despues = leerValorLugar(anexo.valor_nuevo) ?? {}
        return CAMPOS_LUGAR.map((campo) => ({
            ...anexo,
            campo_modificado: campo,
            valor_anterior: antes[campo] ?? null,
            valor_nuevo: despues[campo] ?? null
        }))
    })
}

// ¿El lugar nuevo es el mismo que ya tiene el contrato?
function mismoLugar(contrato, nuevo) {
    return valorLugar(contrato) === valorLugar(nuevo)
}

module.exports = { CAMPO_SUCURSAL, CAMPOS_LUGAR, valorLugar, leerValorLugar, expandirAnexos, mismoLugar }
