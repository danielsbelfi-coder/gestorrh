// Validación de la inscripción masiva de personas (función pura, sin base de datos).
// Recibe las filas de la planilla ya leídas como objetos { columna: texto } y devuelve
// las personas listas para crear o la lista completa de errores por fila. Si hay un solo error, no se carga nada.

const { limpiarRut, rutEsValido } = require("../shared/rut.js")
const { esFechaValida } = require("../shared/fechas.js")

const MAXIMO_FILAS = 500

const COLUMNAS = [
    "rut", "dv", "nombres", "apellido_paterno", "apellido_materno", "nacionalidad", "fecha_nacimiento",
    "sexo", "estado_civil", "direccion", "telefono", "email", "afp", "afiliado_afc", "sistema_salud",
    "isapre", "plan_isapre_uf", "banco", "tipo_cuenta", "numero_cuenta", "crear_postulante", "fecha_ingreso"
]

const TIPOS_CUENTA = {
    corriente: "cuenta corriente", "cuenta corriente": "cuenta corriente",
    rut: "cuenta Rut", "cuenta rut": "cuenta Rut",
    ahorro: "cuenta de ahorro", "cuenta de ahorro": "cuenta de ahorro",
    vista: "cuenta vista", "cuenta vista": "cuenta vista"
}

function texto(valor) {
    return String(valor ?? "").trim()
}

// Minúsculas y sin tildes, para comparar nombres de AFP, isapres y opciones.
function normalizar(valor) {
    return texto(valor).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// Acepta dd-mm-aaaa, dd/mm/aaaa o aaaa-mm-dd. Devuelve aaaa-mm-dd o null.
function leerFecha(valor) {
    const t = texto(valor)
    const local = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    const iso = local ? `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}` : t
    return esFechaValida(iso) ? iso : null
}

// "sí", "si", "s", "x", "1", "true" → true; "no", "n", "0", "false" o vacío → false; otra cosa → null.
function leerSiNo(valor) {
    const t = normalizar(valor)
    if (["si", "s", "x", "1", "true"].includes(t)) {
        return true
    }
    if (["", "no", "n", "0", "false"].includes(t)) {
        return false
    }
    return null
}

function buscarPorNombre(lista, valor) {
    const buscado = normalizar(valor)
    return lista.find((item) => item.estado !== "inactivo" && normalizar(item.nombre) === buscado) ?? null
}

function validarFila(fila, catalogos) {
    const motivos = []
    const vacio = (campo) => texto(fila[campo]) === ""

    for (const campo of ["rut", "dv", "nombres", "apellido_paterno", "nacionalidad", "fecha_nacimiento", "direccion"]) {
        if (vacio(campo)) {
            motivos.push(`falta ${campo}`)
        }
    }

    const rut = limpiarRut(texto(fila.rut))
    const dv = texto(fila.dv).toUpperCase()
    if (!vacio("rut") && !vacio("dv") && !rutEsValido(rut, dv)) {
        motivos.push("RUT inválido")
    }

    const nacionalidad = normalizar(fila.nacionalidad)
    if (!vacio("nacionalidad") && !["chilena", "extranjera"].includes(nacionalidad)) {
        motivos.push("nacionalidad debe ser chilena o extranjera")
    }

    const fechaNacimiento = leerFecha(fila.fecha_nacimiento)
    if (!vacio("fecha_nacimiento") && fechaNacimiento === null) {
        motivos.push("fecha_nacimiento inválida (usa dd-mm-aaaa)")
    }

    const sexo = { "": null, m: "masculino", masculino: "masculino", f: "femenino", femenino: "femenino" }[normalizar(fila.sexo)]
    if (sexo === undefined) {
        motivos.push("sexo debe ser masculino o femenino")
    }

    const email = texto(fila.email)
    if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        motivos.push("email inválido")
    }

    let afpId = null
    if (!vacio("afp")) {
        const afp = buscarPorNombre(catalogos.afps, fila.afp)
        if (afp === null) {
            motivos.push(`la AFP "${texto(fila.afp)}" no existe`)
        } else {
            afpId = afp.id
        }
    }

    const afiliadoAfc = vacio("afiliado_afc") ? true : leerSiNo(fila.afiliado_afc)
    if (afiliadoAfc === null) {
        motivos.push("afiliado_afc debe ser sí o no")
    }

    const sistemaSalud = { "": null, fonasa: "Fonasa", isapre: "Isapre" }[normalizar(fila.sistema_salud)]
    let isapreId = null
    let planUf = null
    if (sistemaSalud === undefined) {
        motivos.push("sistema_salud debe ser Fonasa o Isapre")
    } else if (sistemaSalud === "Isapre") {
        const isapre = buscarPorNombre(catalogos.isapres, fila.isapre)
        if (isapre === null) {
            motivos.push(vacio("isapre") ? "falta la isapre" : `la isapre "${texto(fila.isapre)}" no existe`)
        } else {
            isapreId = isapre.id
        }
        planUf = Number(texto(fila.plan_isapre_uf).replace(",", "."))
        if (vacio("plan_isapre_uf") || !Number.isFinite(planUf) || planUf <= 0) {
            motivos.push("plan_isapre_uf debe ser un número mayor que 0 (en UF)")
        }
    }

    const tipoCuenta = vacio("tipo_cuenta") ? null : TIPOS_CUENTA[normalizar(fila.tipo_cuenta)]
    if (tipoCuenta === undefined) {
        motivos.push("tipo_cuenta debe ser corriente, rut, ahorro o vista")
    }

    // Banco por nombre o por código (catálogo de src/shared/bancos.js).
    const { bancoDeTexto } = require("../shared/bancos.js")
    const bancoCodigo = vacio("banco") ? null : bancoDeTexto(fila.banco)
    if (!vacio("banco") && bancoCodigo === null) {
        motivos.push("banco no reconocido: escriba el nombre (por ejemplo, BancoEstado, Santander) o su código de 3 dígitos")
    }

    const crearPostulante = leerSiNo(fila.crear_postulante)
    let fechaIngreso = null
    if (crearPostulante === null) {
        motivos.push("crear_postulante debe ser sí o no")
    } else if (crearPostulante) {
        fechaIngreso = leerFecha(fila.fecha_ingreso)
        if (fechaIngreso === null) {
            motivos.push("para crear el postulante falta una fecha_ingreso válida (dd-mm-aaaa)")
        }
    }

    const opcional = (campo) => (vacio(campo) ? null : texto(fila[campo]))

    return {
        motivos,
        persona: {
            rut,
            dv,
            nombres: texto(fila.nombres),
            apellido_paterno: texto(fila.apellido_paterno),
            apellido_materno: opcional("apellido_materno"),
            nacionalidad,
            fecha_nacimiento: fechaNacimiento,
            sexo_genero: sexo ?? null,
            estado_civil: opcional("estado_civil"),
            direccion: texto(fila.direccion),
            telefono: opcional("telefono"),
            email: email || null,
            afp_id: afpId,
            afiliado_afc: afiliadoAfc ?? true,
            sistema_salud: sistemaSalud ?? null,
            isapre_id: isapreId,
            plan_isapre_uf: sistemaSalud === "Isapre" ? planUf : null,
            banco: opcional("banco"),
            banco_codigo: bancoCodigo,
            tipo_cuenta: tipoCuenta ?? null,
            numero_cuenta: opcional("numero_cuenta")
        },
        postulante: crearPostulante ? { fecha_ingreso: fechaIngreso } : null
    }
}

// catalogos: { afps, isapres, rutsExistentes: Set de RUT (sin DV) ya registrados en la empresa }
function validarImportacion(filas, catalogos) {
    const errores = []
    const personas = []
    const rutsEnPlanilla = new Map()

    filas.forEach((fila, indice) => {
        const numeroFila = indice + 2 // la fila 1 es el encabezado
        const { motivos, persona, postulante } = validarFila(fila, catalogos)

        if (persona.rut !== "") {
            if (catalogos.rutsExistentes.has(persona.rut)) {
                motivos.push("ya existe una persona con ese RUT en la empresa")
            }
            if (rutsEnPlanilla.has(persona.rut)) {
                motivos.push(`RUT repetido en la planilla (fila ${rutsEnPlanilla.get(persona.rut)})`)
            } else {
                rutsEnPlanilla.set(persona.rut, numeroFila)
            }
        }

        if (motivos.length > 0) {
            errores.push({ fila: numeroFila, rut: texto(fila.rut), motivos })
        } else {
            personas.push({ fila: numeroFila, persona, postulante })
        }
    })

    return { personas, errores }
}

module.exports = {
    COLUMNAS,
    MAXIMO_FILAS,
    leerFecha,
    leerSiNo,
    validarImportacion
}
