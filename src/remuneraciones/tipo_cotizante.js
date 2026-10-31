const SIN_SITUACION = { pensionado: false, cotiza_afp: true, tipo_pension: null, tecnico_extranjero: false }

const REGLAS = {
    0: { afp: true, seguroSocial: true, cesantia: true },
    9: { afp: true, seguroSocial: true, cesantia: true },
    1: { afp: true, seguroSocial: false, cesantia: false },
    2: { afp: false, seguroSocial: false, cesantia: false },
    3: { afp: true, seguroSocial: false, cesantia: true },
    8: { afp: false, seguroSocial: false, cesantia: true }
}

function situacionDelMes(situaciones, primerDia) {
    const vigentes = situaciones
        .filter((situacion) => situacion.desde <= primerDia)
        .sort((a, b) => a.desde.localeCompare(b.desde))

    return vigentes.length > 0 ? vigentes[vigentes.length - 1] : SIN_SITUACION
}

function tipoCotizante(situacion, edad) {
    if (!situacion.pensionado) {
        if (!situacion.cotiza_afp) {
            return 8
        }
        return edad >= 65 ? 3 : 0
    }
    if (situacion.tipo_pension === "invalidez_parcial") {
        return 9
    }
    return situacion.cotiza_afp ? 1 : 2
}

function reglasCotizante(tipo) {
    return REGLAS[tipo]
}

module.exports = {
    situacionDelMes,
    tipoCotizante,
    reglasCotizante
}