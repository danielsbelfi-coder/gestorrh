// Reglas puras del ahorro previsional voluntario (APVI, APVC) y del depósito convenido. Sin base de datos.
// Ver «CCAF, APV y depósito convenido» en el SPEC.

const TIPOS_AHORRO = ["apvi", "apvc", "deposito_convenido"]
const REGIMENES = ["A", "B"]
const MODALIDADES = ["pesos", "uf", "porcentaje"]
const FORMAS_PAGO = [1, 2] // 1 directa, 2 indirecta (tabla 12 de Previred)
// El APV régimen B descontado por planilla rebaja la base del impuesto único hasta este tope mensual (art. 42 bis LIR).
const TOPE_REBAJA_APV_B_UF = 50

const NOMBRES_TIPO = { apvi: "APV individual", apvc: "APV colectivo", deposito_convenido: "Depósito convenido" }

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === ""
const mes = (fecha) => String(fecha).slice(0, 7)

// "AAAA-MM" → "AAAA-MM-01"; cualquier otra cosa → null.
function desdeDeMes(texto) {
    return typeof texto === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(texto) ? `${texto}-01` : null
}

function numero(valor) {
    return Number(String(valor ?? "").replace(",", "."))
}

// Revisa los datos de un ahorro. Devuelve la lista de errores.
function validarAhorro(datos) {
    const errores = []
    const tipo = datos?.tipo
    if (!TIPOS_AHORRO.includes(tipo)) {
        errores.push("El tipo debe ser APV individual, APV colectivo o depósito convenido")
    }
    if (!/^\d{3}$/.test(String(datos?.institucion_codigo ?? "")) || datos.institucion_codigo === "000") {
        errores.push("El código de la institución debe tener 3 dígitos (tabla de Previred)")
    }
    if (vacio(datos?.institucion_nombre)) {
        errores.push("Debe indicar el nombre de la institución")
    } else if (String(datos.institucion_nombre).trim().length > 80) {
        errores.push("El nombre de la institución admite hasta 80 caracteres")
    }
    if (!vacio(datos?.numero_contrato) && String(datos.numero_contrato).trim().length > 20) {
        errores.push("El número de contrato admite hasta 20 caracteres")
    }
    if (!FORMAS_PAGO.includes(Number(datos?.forma_pago))) {
        errores.push("La forma de pago debe ser directa (1) o indirecta (2)")
    }
    if (tipo !== "deposito_convenido" && !REGIMENES.includes(datos?.regimen)) {
        errores.push("El régimen debe ser A o B")
    }
    if (!MODALIDADES.includes(datos?.modalidad)) {
        errores.push("La modalidad debe ser pesos, UF o porcentaje")
    }

    const maximo = datos?.modalidad === "porcentaje" ? 100 : 1e8
    const monto = numero(datos?.monto)
    const conAporte = tipo === "apvc" && !vacio(datos?.aporte_empleador)
    const aporte = conAporte ? numero(datos.aporte_empleador) : 0
    if (tipo === "apvc") {
        if (!(Number.isFinite(monto) && monto >= 0 && monto <= maximo) || !(Number.isFinite(aporte) && aporte >= 0 && aporte <= maximo) || monto + aporte <= 0) {
            errores.push("El monto del trabajador y el aporte del empleador deben ser números positivos (al menos uno mayor que 0)")
        }
    } else if (!(Number.isFinite(monto) && monto > 0 && monto <= maximo)) {
        errores.push(datos?.modalidad === "porcentaje" ? "El porcentaje debe ser mayor que 0 y hasta 100" : "El monto debe ser un número mayor que 0")
    }

    const desde = desdeDeMes(datos?.desde)
    if (desde === null) {
        errores.push("El mes desde debe tener el formato AAAA-MM")
    }
    if (!vacio(datos?.hasta)) {
        const hasta = desdeDeMes(datos.hasta)
        if (hasta === null) {
            errores.push("El mes hasta debe tener el formato AAAA-MM")
        } else if (desde !== null && hasta < desde) {
            errores.push("El mes hasta no puede ser anterior al mes desde")
        }
    }
    return errores
}

function normalizarAhorro(datos) {
    const tipo = datos.tipo
    return {
        tipo,
        institucion_codigo: String(datos.institucion_codigo),
        institucion_nombre: String(datos.institucion_nombre).trim(),
        numero_contrato: vacio(datos.numero_contrato) ? null : String(datos.numero_contrato).trim(),
        forma_pago: Number(datos.forma_pago),
        regimen: tipo === "deposito_convenido" ? null : datos.regimen,
        modalidad: datos.modalidad,
        monto: numero(datos.monto),
        aporte_empleador: tipo === "apvc" && !vacio(datos.aporte_empleador) ? numero(datos.aporte_empleador) : null,
        desde: desdeDeMes(datos.desde),
        hasta: vacio(datos.hasta) ? null : desdeDeMes(datos.hasta)
    }
}

// ¿El ahorro rige en el mes "AAAA-MM"?
function vigenteEnMes(ahorro, mesTexto) {
    return mes(ahorro.desde) <= mesTexto && (ahorro.hasta === null || ahorro.hasta === undefined || mes(ahorro.hasta) >= mesTexto)
}

function ahorrosDelMes(ahorros, anio, mesNumero) {
    const mesTexto = `${anio}-${String(mesNumero).padStart(2, "0")}`
    return (ahorros ?? []).filter((ahorro) => vigenteEnMes(ahorro, mesTexto))
}

// Dos ahorros del mismo tipo no pueden regir en un mismo mes (Previred tiene un solo bloque de cada uno).
function seCruzan(a, b) {
    const finA = a.hasta === null || a.hasta === undefined ? "9999-12" : mes(a.hasta)
    const finB = b.hasta === null || b.hasta === undefined ? "9999-12" : mes(b.hasta)
    return a.tipo === b.tipo && mes(a.desde) <= finB && mes(b.desde) <= finA
}

// Monto en pesos de un valor según su modalidad.
function enPesos(modalidad, valor, { valorUF, rentaImponible }) {
    const cantidad = Number(valor ?? 0)
    if (modalidad === "uf") {
        return Math.round(cantidad * valorUF)
    }
    if (modalidad === "porcentaje") {
        return Math.round(rentaImponible * cantidad / 100)
    }
    return Math.round(cantidad)
}

// Montos del mes de los ahorros vigentes. Devuelve lo que se guarda en la liquidación:
// { apvi, apvc, depositoConvenido, rebajaTributable } (cada producto null si no hay).
function calcularAhorros(ahorros, { valorUF, rentaImponible }) {
    const valores = { valorUF, rentaImponible }
    const de = (tipo) => ahorros.find((ahorro) => ahorro.tipo === tipo) ?? null
    const datosInstitucion = (ahorro) => ({
        institucionCodigo: ahorro.institucion_codigo,
        institucionNombre: ahorro.institucion_nombre,
        numeroContrato: ahorro.numero_contrato ?? null,
        formaPago: Number(ahorro.forma_pago)
    })

    const apviFila = de("apvi")
    const apvcFila = de("apvc")
    const dcFila = de("deposito_convenido")

    const apvi = apviFila === null ? null : {
        ...datosInstitucion(apviFila),
        regimen: apviFila.regimen,
        monto: enPesos(apviFila.modalidad, apviFila.monto, valores)
    }
    const apvc = apvcFila === null ? null : {
        ...datosInstitucion(apvcFila),
        regimen: apvcFila.regimen,
        trabajador: enPesos(apvcFila.modalidad, apvcFila.monto, valores),
        empleador: enPesos(apvcFila.modalidad, apvcFila.aporte_empleador, valores)
    }
    const depositoConvenido = dcFila === null ? null : {
        ...datosInstitucion(dcFila),
        monto: enPesos(dcFila.modalidad, dcFila.monto, valores)
    }

    const regimenB = (apvi?.regimen === "B" ? apvi.monto : 0) + (apvc?.regimen === "B" ? apvc.trabajador : 0)
    const rebajaTributable = Math.min(regimenB, Math.round(TOPE_REBAJA_APV_B_UF * valorUF))

    return { apvi, apvc, depositoConvenido, rebajaTributable }
}

// Meses "AAAA-MM" cerrados que caen dentro de [desde, hasta] (hasta null = sin término).
function mesesCerradosEnRango(desde, hasta, mesesCerrados) {
    const desdeMes = mes(desde)
    const hastaMes = hasta === null || hasta === undefined ? "9999-12" : mes(hasta)
    return [...new Set(mesesCerrados.map(({ anio, mes: m }) => `${anio}-${String(m).padStart(2, "0")}`)
        .filter((m) => m >= desdeMes && m <= hastaMes))].sort()
}

module.exports = {
    TIPOS_AHORRO,
    REGIMENES,
    MODALIDADES,
    NOMBRES_TIPO,
    TOPE_REBAJA_APV_B_UF,
    validarAhorro,
    normalizarAhorro,
    ahorrosDelMes,
    seCruzan,
    enPesos,
    calcularAhorros,
    mesesCerradosEnRango
}
