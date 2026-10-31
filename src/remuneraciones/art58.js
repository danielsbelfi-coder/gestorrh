// Art. 58 del Código del Trabajo: los descuentos voluntarios pactados por escrito no pueden pasar del 15 % de la
// remuneración total. Se mide sobre los haberes imponibles del mes y solo se avisa (no bloquea ni topa).
// Ver «Art. 58: límite del 15 % de los descuentos voluntarios» en el SPEC.

const PORCENTAJE_ART58 = 15

// lineas: [{ concepto: { tipo, limite_art58 }, monto }]; base: haberes imponibles del mes.
function revisarArt58(lineas, base) {
    const voluntarios = lineas
        .filter((linea) => linea.concepto.tipo === "descuento" && linea.concepto.limite_art58 === true)
        .reduce((suma, linea) => suma + Number(linea.monto), 0)
    const tope = Math.round(Math.max(0, base) * PORCENTAJE_ART58 / 100)
    return { base: Math.max(0, base), tope, voluntarios, exceso: Math.max(0, voluntarios - tope) }
}

module.exports = { PORCENTAJE_ART58, revisarArt58 }
