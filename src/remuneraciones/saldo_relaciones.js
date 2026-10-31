// Pura: saldo de pago en exceso que quedó sin recuperar en finiquitos de relaciones anteriores de una persona.
// No se descuenta solo (es otra relación laboral): requiere la autorización firmada del trabajador y se ingresa a mano
// como variable «Descuento por pago en exceso». Ver «Saldo pendiente de una relación anterior» en el SPEC.

// finiquitos: [{ no_recuperado, cerrado }]; descontado: suma de las variables ya ingresadas.
function saldoPendiente(finiquitos, descontado) {
    const abierto = finiquitos.filter((f) => !f.cerrado).reduce((suma, f) => suma + Number(f.no_recuperado), 0)
    return Math.max(0, abierto - Number(descontado ?? 0))
}

module.exports = { saldoPendiente }
