// Correos de usuarios: se guardan siempre sin espacios y en minúsculas, para que
// "Admin@Cliente.cl" y "admin@cliente.cl" sean la misma cuenta.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizarEmail(valor) {
    return typeof valor === "string" ? valor.trim().toLowerCase() : ""
}

function emailValido(email) {
    return email.length <= 200 && EMAIL.test(email)
}

module.exports = { normalizarEmail, emailValido }
