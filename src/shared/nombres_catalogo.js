// Búsqueda tolerante de nombres de catálogo (AFP, isapres): no importan mayúsculas, tildes, espacios ni la palabra
// inicial «AFP» o «Isapre». «provida», «Pro Vida», «AFP ProVida» y «PROVIDA» son la misma AFP; «Colmena» encuentra
// «Isapre Colmena Golden Cross» y «Mas Vida» encuentra «Isapre Nueva Masvida».

const PALABRAS_INICIALES = ["afp", "isapre", "banco"]

function sinTildes(texto) {
    return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// Texto comparable: minúsculas, sin tildes, sin puntuación ni espacios y sin la palabra inicial «afp»/«isapre».
function claveDeNombre(texto) {
    let palabras = sinTildes(texto).replace(/[^a-z0-9ñ]+/g, " ").trim().split(" ").filter(Boolean)

    if (palabras.length > 1 && PALABRAS_INICIALES.includes(palabras[0])) {
        palabras = palabras.slice(1)
    }

    return palabras.join("")
}

// Devuelve { item } si hay un solo candidato, { ambiguos: [item…] } si varios calzan, o null si ninguno.
// Primero se busca el nombre completo; si no está, el que contiene lo escrito (o está contenido en ello), con al menos
// 4 letras para que «uno» o «vida» sueltos no calcen con cualquier cosa.
function buscarEnCatalogo(lista, texto) {
    const buscado = claveDeNombre(texto)
    if (buscado === "") {
        return null
    }

    const activos = lista.filter((item) => item.estado !== "inactivo")

    const exactos = activos.filter((item) => claveDeNombre(item.nombre) === buscado)
    if (exactos.length === 1) {
        return { item: exactos[0] }
    }
    if (exactos.length > 1) {
        return { ambiguos: exactos }
    }

    if (buscado.length < 4) {
        return null
    }

    const parecidos = activos.filter((item) => {
        const clave = claveDeNombre(item.nombre)
        return clave.includes(buscado) || (clave.length >= 4 && buscado.includes(clave))
    })

    if (parecidos.length === 1) {
        return { item: parecidos[0] }
    }

    return parecidos.length > 1 ? { ambiguos: parecidos } : null
}

// Nombres para mostrar en los mensajes de error y en la guía de valores válidos.
function nombresDelCatalogo(lista) {
    return lista.filter((item) => item.estado !== "inactivo").map((item) => item.nombre)
}

module.exports = {
    claveDeNombre,
    buscarEnCatalogo,
    nombresDelCatalogo
}
