const CAUSALES = {
    3: "Art. 159 N° 1: Mutuo acuerdo de las partes",
    4: "Art. 159 N° 2: Renuncia del trabajador",
    5: "Art. 159 N° 3: Muerte del trabajador",
    6: "Art. 159 N° 4: Vencimiento del plazo convenido en el contrato",
    7: "Art. 159 N° 5: Conclusión del trabajo o servicio que dio origen al contrato",
    8: "Art. 159 N° 6: Caso fortuito o fuerza mayor",
    11: "Art. 160 N° 2: Negociaciones prohibidas por escrito",
    12: "Art. 160 N° 3: No concurrencia a las labores",
    13: "Art. 160 N° 4: Abandono del trabajo",
    14: "Art. 160 N° 5: Actos, omisiones o imprudencias temerarias",
    15: "Art. 160 N° 6: Perjuicio material causado intencionalmente",
    16: "Art. 160 N° 7: Incumplimiento grave de las obligaciones que impone el contrato",
    18: "Art. 161 inciso 1°: Necesidades de la empresa",
    19: "Art. 161 inciso 2°: Desahucio escrito del empleador",
    20: "Art. 163 bis: Procedimiento concursal de liquidación",
    24: "Art. 160 N° 1 letra a): Falta de probidad",
    25: "Art. 160 N° 1 letra b): Conductas de acoso sexual",
    26: "Art. 160 N° 1 letra c): Vías de hecho",
    27: "Art. 160 N° 1 letra d): Injurias",
    28: "Art. 160 N° 1 letra e): Conducta inmoral",
    29: "Art. 160 N° 1 letra f): Conductas de acoso laboral"
}

const CAUSALES_TERMINO = Object.keys(CAUSALES).map(Number)

module.exports = { CAUSALES, CAUSALES_TERMINO }