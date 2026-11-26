// Validación de la inscripción masiva de personas (función pura, sin base de datos).
// Recibe las filas de la planilla ya leídas como objetos { columna: texto } y devuelve
// las personas listas para crear o la lista completa de errores por fila. Si hay un solo error, no se carga nada.

const { limpiarRut, rutEsValido } = require("../shared/rut.js")
const { esFechaValida } = require("../shared/fechas.js")
const { buscarEnCatalogo, nombresDelCatalogo } = require("../shared/nombres_catalogo.js")
const { BANCOS, TIPOS_CUENTA: TIPOS_CUENTA_VALIDOS, bancoDeTexto } = require("../shared/bancos.js")
const { nombreExCaja, resolverExCaja } = require("./ex_caja_texto.js")

const MAXIMO_FILAS = 500

const COLUMNAS = [
    "rut", "dv", "nombres", "apellido_paterno", "apellido_materno", "nacionalidad", "fecha_nacimiento",
    "sexo", "estado_civil", "direccion", "telefono", "email", "afp", "ex_caja", "cotiza_desahucio", "afiliado_afc",
    "sistema_salud", "isapre", "plan_isapre_uf", "forma_pago", "banco", "tipo_cuenta", "numero_cuenta", "crear_postulante", "fecha_ingreso"
]

// Columnas que una planilla antigua puede no traer (la pantalla y la validación las dejan vacías).
const COLUMNAS_OPCIONALES = ["forma_pago", "ex_caja", "cotiza_desahucio"]

// Las opciones se comparan sin mayúsculas, tildes ni puntuación («Cta. Cte.» = «cta cte»).
const TIPOS_CUENTA = {
    corriente: "cuenta corriente", "cuenta corriente": "cuenta corriente", "cta corriente": "cuenta corriente", "cta cte": "cuenta corriente", cc: "cuenta corriente",
    rut: "cuenta Rut", "cuenta rut": "cuenta Rut", cuentarut: "cuenta Rut", "cta rut": "cuenta Rut",
    ahorro: "cuenta de ahorro", ahorros: "cuenta de ahorro", "cuenta de ahorro": "cuenta de ahorro", "cuenta ahorro": "cuenta de ahorro", "cta ahorro": "cuenta de ahorro",
    vista: "cuenta vista", "cuenta vista": "cuenta vista", "cta vista": "cuenta vista"
}

// Forma de pago de la remuneración. Vacía = transferencia (lo que ya se hacía antes de existir la columna).
const FORMAS_PAGO = {
    transferencia: "transferencia", "transferencia bancaria": "transferencia", "transferencia electronica": "transferencia", deposito: "transferencia",
    cheque: "cheque",
    efectivo: "efectivo",
    "vale vista": "vale_vista", vale_vista: "vale_vista", valevista: "vale_vista"
}

const SEXOS = { "": null, m: "masculino", masculino: "masculino", hombre: "masculino", f: "femenino", femenino: "femenino", mujer: "femenino" }
const NACIONALIDADES = { chilena: "chilena", chileno: "chilena", extranjera: "extranjera", extranjero: "extranjera" }

function texto(valor) {
    return String(valor ?? "").trim()
}

// Minúsculas y sin tildes, para comparar opciones.
function normalizar(valor) {
    return texto(valor).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

// Para las opciones con sinónimos: además, sin puntos ni guiones y con los espacios simples («Cta. Cte.» → «cta cte»).
function normalizarOpcion(valor) {
    return normalizar(valor).replace(/[^a-z0-9_ ]+/g, " ").replace(/\s+/g, " ").trim()
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

// Resultado de buscar un nombre del catálogo: { id } o { motivo } con los valores válidos para corregir.
function resolverCatalogo(lista, valor, etiqueta) {
    const encontrado = buscarEnCatalogo(lista, valor)

    if (encontrado?.item) {
        return { id: encontrado.item.id }
    }
    if (encontrado?.ambiguos) {
        return { motivo: `${etiqueta} "${texto(valor)}" es ambigua (${encontrado.ambiguos.map((i) => i.nombre).join(", ")}): escribe el nombre completo` }
    }
    return { motivo: `${etiqueta} "${texto(valor)}" no existe (valores válidos: ${nombresDelCatalogo(lista).join(", ")})` }
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

    const nacionalidad = NACIONALIDADES[normalizarOpcion(fila.nacionalidad)]
    if (!vacio("nacionalidad") && nacionalidad === undefined) {
        motivos.push("nacionalidad debe ser chilena o extranjera")
    }

    const fechaNacimiento = leerFecha(fila.fecha_nacimiento)
    if (!vacio("fecha_nacimiento") && fechaNacimiento === null) {
        motivos.push("fecha_nacimiento inválida (usa dd-mm-aaaa)")
    }

    const sexo = SEXOS[normalizarOpcion(fila.sexo)]
    if (sexo === undefined) {
        motivos.push("sexo debe ser masculino o femenino")
    }

    const email = texto(fila.email)
    if (email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        motivos.push("email inválido")
    }

    let afpId = null
    if (!vacio("afp")) {
        const afp = resolverCatalogo(catalogos.afps, fila.afp, "la AFP")
        if (afp.motivo) {
            motivos.push(afp.motivo)
        } else {
            afpId = afp.id
        }
    }

    // Paquete AH: imponente del IPS (caja antigua). Con ex-caja no lleva AFP; desahucio vacío = sí (si su régimen lo tiene).
    let exCaja = null
    if (!vacio("ex_caja")) {
        const resuelta = resolverExCaja(catalogos.exCajas ?? [], fila.ex_caja)
        if (resuelta.motivo) {
            motivos.push(resuelta.motivo)
        } else {
            exCaja = resuelta.item
        }
        if (!vacio("afp")) {
            motivos.push("un imponente del IPS (ex_caja) no lleva AFP: deja la columna afp vacía")
        }
    }
    const cotizaDesahucio = vacio("cotiza_desahucio") ? true : leerSiNo(fila.cotiza_desahucio)
    if (cotizaDesahucio === null) {
        motivos.push("cotiza_desahucio debe ser sí o no")
    } else if (!vacio("cotiza_desahucio") && vacio("ex_caja")) {
        motivos.push("cotiza_desahucio solo se llena junto con ex_caja")
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
        const isapre = vacio("isapre") ? { motivo: "falta la isapre" } : resolverCatalogo(catalogos.isapres, fila.isapre, "la isapre")
        if (isapre.motivo) {
            motivos.push(isapre.motivo)
        } else {
            isapreId = isapre.id
        }
        planUf = Number(texto(fila.plan_isapre_uf).replace(",", "."))
        if (vacio("plan_isapre_uf") || !Number.isFinite(planUf) || planUf <= 0) {
            motivos.push("plan_isapre_uf debe ser un número mayor que 0 (en UF)")
        }
    }

    const formaPago = vacio("forma_pago") ? "transferencia" : FORMAS_PAGO[normalizarOpcion(fila.forma_pago)]
    if (formaPago === undefined) {
        motivos.push("forma_pago debe ser transferencia, cheque, efectivo o vale vista")
    }

    const tipoCuenta = vacio("tipo_cuenta") ? null : TIPOS_CUENTA[normalizarOpcion(fila.tipo_cuenta)]
    if (tipoCuenta === undefined) {
        // «Cheque», «efectivo» o «vale vista» en esta columna es el error más común: tienen su propia columna.
        motivos.push(FORMAS_PAGO[normalizarOpcion(fila.tipo_cuenta)] !== undefined
            ? `«${texto(fila.tipo_cuenta)}» es una forma de pago: va en la columna forma_pago (tipo_cuenta es corriente, rut, ahorro o vista)`
            : "tipo_cuenta debe ser corriente, rut, ahorro o vista")
    }

    // Banco por nombre o por código (catálogo de src/shared/bancos.js).
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
            forma_pago: formaPago ?? "transferencia",
            banco: opcional("banco"),
            banco_codigo: bancoCodigo,
            tipo_cuenta: tipoCuenta ?? null,
            numero_cuenta: opcional("numero_cuenta")
        },
        prevision: {
            regimen: exCaja ? "IPS" : "AFP",
            ex_caja_regimen_id: exCaja?.id ?? null,
            cotiza_desahucio: exCaja !== null && Boolean(exCaja.codigo_desahucio) && cotizaDesahucio === true
        },
        postulante: crearPostulante ? { fecha_ingreso: fechaIngreso } : null
    }
}

// catalogos: { afps, isapres, exCajas, rutsExistentes: Set de RUT (sin DV) ya registrados en la empresa }
function validarImportacion(filas, catalogos) {
    const errores = []
    const personas = []
    const rutsEnPlanilla = new Map()

    filas.forEach((fila, indice) => {
        const numeroFila = indice + 2 // la fila 1 es el encabezado
        const { motivos, persona, prevision, postulante } = validarFila(fila, catalogos)

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
            personas.push({ fila: numeroFila, persona, prevision, postulante })
        }
    })

    return { personas, errores }
}

// Guía de valores válidos por columna (hoja «Valores válidos» de la plantilla y panel de ayuda de la pantalla).
function valoresValidos(catalogos) {
    return [
        { columna: "nacionalidad", valores: ["chilena", "extranjera"] },
        { columna: "sexo", valores: ["masculino", "femenino"] },
        { columna: "afp", valores: nombresDelCatalogo(catalogos.afps) },
        { columna: "ex_caja", valores: (catalogos.exCajas ?? []).map(nombreExCaja) },
        { columna: "cotiza_desahucio", valores: ["sí", "no"] },
        { columna: "afiliado_afc", valores: ["sí", "no"] },
        { columna: "sistema_salud", valores: ["Fonasa", "Isapre"] },
        { columna: "isapre", valores: nombresDelCatalogo(catalogos.isapres) },
        { columna: "forma_pago", valores: ["transferencia", "cheque", "efectivo", "vale vista"] },
        { columna: "banco", valores: Object.values(BANCOS) },
        { columna: "tipo_cuenta", valores: TIPOS_CUENTA_VALIDOS },
        { columna: "crear_postulante", valores: ["sí", "no"] }
    ]
}

module.exports = {
    COLUMNAS,
    valoresValidos,
    COLUMNAS_OPCIONALES,
    FORMAS_PAGO,
    MAXIMO_FILAS,
    leerFecha,
    leerSiNo,
    normalizar,
    resolverCatalogo,
    validarImportacion
}
