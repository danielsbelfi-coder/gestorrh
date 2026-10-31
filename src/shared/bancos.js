// Catálogo de bancos e instituciones para el pago de remuneraciones, con su código de transferencia interbancaria.
// Códigos tomados de listas de transferencias publicadas (Rankia, documentación de pagos de Pagsmile; consultadas el
// 31-10-2026). Conviene confirmarlos con el banco de la empresa al usar la nómina por primera vez.
const BANCOS = {
    "001": "Banco de Chile",
    "009": "Banco Internacional",
    "012": "BancoEstado",
    "014": "Scotiabank",
    "016": "BCI",
    "028": "Banco BICE",
    "031": "HSBC Bank",
    "037": "Banco Santander",
    "039": "Banco Itaú",
    "049": "Banco Security",
    "051": "Banco Falabella",
    "053": "Banco Ripley",
    "055": "Banco Consorcio",
    "059": "Banco BTG Pactual",
    "152": "Prepago Los Héroes",
    "672": "Coopeuch",
    "730": "Tenpo",
    "875": "Mercado Pago"
}

// Alias (sin tildes, en minúsculas) → código. El orden importa: «banco del estado de chile» antes que «chile».
const ALIAS = [
    ["estado", "012"], ["cuenta rut", "012"], ["cuentarut", "012"],
    ["prepago los heroes", "152"], ["los heroes", "152"],
    ["credito e inversiones", "016"], ["bci", "016"], ["mach", "016"],
    ["santander", "037"], ["itau", "039"], ["corpbanca", "039"], ["scotiabank", "014"], ["scotia", "014"],
    ["bice", "028"], ["hsbc", "031"], ["security", "049"], ["falabella", "051"], ["ripley", "053"],
    ["consorcio", "055"], ["internacional", "009"], ["btg", "059"],
    ["coopeuch", "672"], ["dale", "672"], ["tenpo", "730"], ["mercado pago", "875"], ["mercadopago", "875"],
    ["edwards", "001"], ["citi", "001"], ["chile", "001"]
]

const TIPOS_CUENTA = ["cuenta corriente", "cuenta Rut", "cuenta de ahorro", "cuenta vista"]
const FORMAS_PAGO = ["transferencia", "cheque", "efectivo", "vale_vista"]

function normalizar(texto) {
    return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

// El código del banco a partir de un texto: el código («12», «012») o el nombre (con alias). null si no se reconoce.
function bancoDeTexto(texto) {
    const limpio = normalizar(texto)
    if (limpio === "") {
        return null
    }
    if (/^\d{1,3}$/.test(limpio)) {
        const codigo = limpio.padStart(3, "0")
        return BANCOS[codigo] ? codigo : null
    }
    const alias = ALIAS.find(([clave]) => limpio.includes(clave))
    return alias ? alias[1] : null
}

// Por qué una persona no puede ir en la nómina de transferencias (null si puede).
function motivoSinTransferencia(persona) {
    if (persona.forma_pago && persona.forma_pago !== "transferencia") {
        const textos = { cheque: "cheque", efectivo: "efectivo", vale_vista: "vale vista" }
        return `Forma de pago: ${textos[persona.forma_pago] ?? persona.forma_pago}`
    }
    const faltan = []
    if (!persona.banco_codigo || !BANCOS[persona.banco_codigo]) {
        faltan.push("banco")
    }
    if (!persona.tipo_cuenta) {
        faltan.push("tipo de cuenta")
    }
    if (!persona.numero_cuenta || String(persona.numero_cuenta).trim() === "") {
        faltan.push("número de cuenta")
    }
    return faltan.length > 0 ? `Faltan datos bancarios: ${faltan.join(", ")}` : null
}

module.exports = { BANCOS, TIPOS_CUENTA, FORMAS_PAGO, bancoDeTexto, motivoSinTransferencia }
