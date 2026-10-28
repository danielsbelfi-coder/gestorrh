// Precio mensual de una cuenta (función pura). Los precios se pactan en UF y se les suma IVA.

const TASA_IVA = 0.19

function redondear(valor, decimales) {
    const factor = 10 ** decimales
    return Math.round(valor * factor) / factor
}

// plan: { precio_uf, precio_usuario_adicional_uf }; valorUF: UF del mes o null (entonces no se calcula el monto en pesos).
function calcularPrecio({ plan, usuariosAdicionales, valorUF }) {
    const planUF = Number(plan.precio_uf)
    const adicionalUF = Number(plan.precio_usuario_adicional_uf) * usuariosAdicionales
    const netoUF = redondear(planUF + adicionalUF, 4)
    const ivaUF = redondear(netoUF * TASA_IVA, 4)
    const totalUF = redondear(netoUF + ivaUF, 4)

    return {
        plan_uf: planUF,
        usuarios_adicionales: usuariosAdicionales,
        usuario_adicional_uf: Number(plan.precio_usuario_adicional_uf),
        adicionales_uf: redondear(adicionalUF, 4),
        neto_uf: netoUF,
        iva_uf: ivaUF,
        total_uf: totalUF,
        valor_uf: valorUF,
        total_pesos: valorUF === null ? null : Math.round(totalUF * valorUF)
    }
}

module.exports = {
    TASA_IVA,
    calcularPrecio
}
