function tramoAsignacionFamiliar(renta, limites) {
    if (renta <= limites.a) {
        return "A"
    }
    if (renta <= limites.b) {
        return "B"
    }
    if (renta <= limites.c) {
        return "C"
    }
    return "D"
}

module.exports = { tramoAsignacionFamiliar }