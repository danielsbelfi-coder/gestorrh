const PAGADORES_SUBSIDIO = [
    { rut: "96572800", dv: "7", nombre: "Banmédica" },
    { rut: "96856780", dv: "2", nombre: "Consalud" },
    { rut: "96502530", dv: "8", nombre: "Vida Tres" },
    { rut: "76296619", dv: "0", nombre: "Colmena" },
    { rut: "96501450", dv: "0", nombre: "Cruz Blanca" },
    { rut: "96936100", dv: "0", nombre: "Esencial" },
    { rut: "61603000", dv: "0", nombre: "Fonasa" },
    { rut: "96504160", dv: "5", nombre: "Nueva Masvida" },
    { rut: "76334370", dv: "7", nombre: "Isalud" },
    { rut: "71235700", dv: "2", nombre: "Fundación" },
    { rut: "79906120", dv: "1", nombre: "Cruz del Norte" },
    { rut: "70360100", dv: "6", nombre: "Asociación Chilena de Seguridad (ACHS)" },
    { rut: "70285100", dv: "9", nombre: "Mutual de Seguridad CChC" },
    { rut: "70015580", dv: "3", nombre: "Instituto de Seguridad del Trabajo (IST)" },
    { rut: "61533000", dv: "0", nombre: "Instituto de Seguridad Laboral (ISL)" }
]

function buscarPagador(texto) {
    const [rut, dv] = String(texto ?? "").split("-")
    return PAGADORES_SUBSIDIO.find((p) => p.rut === rut && p.dv === String(dv ?? "").toUpperCase()) ?? null
}

module.exports = {
    PAGADORES_SUBSIDIO,
    buscarPagador
}