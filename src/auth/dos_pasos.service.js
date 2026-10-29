// Verificación en dos pasos (TOTP): inscripción, verificación al ingresar, códigos de recuperación y desactivación.
// Ver "Seguridad de acceso" en el SPEC. Las reglas puras están en totp.js, cifrado.js y codigos_recuperacion.js.
const bcrypt = require("bcrypt")
const QRCode = require("qrcode")
const { sequelize } = require("../shared/database.js")
const { Usuario, CodigoRecuperacion } = require("../shared/associations.js")
const { ValidationError, ConflictError } = require("../shared/errors.js")
const { generarSecreto, verificarTotp, uriOtpauth, agruparSecreto } = require("./totp.js")
const { leerClave, cifrar, descifrar } = require("./cifrado.js")
const { generarCodigos, hashCodigo, pareceCodigoRecuperacion } = require("./codigos_recuperacion.js")
const { limite2fa } = require("./limite_2fa.js")
const { CODIGOS_RECUPERACION } = require("../shared/constantes.js")

// La clave se lee en cada uso (la validación al arrancar ya comprobó que es correcta).
function clave() {
    return leerClave(process.env.TOTP_CLAVE_CIFRADO)
}

// El secreto cifrado queda atado a su usuario: copiado a otro usuario en la base, no se puede descifrar.
const contexto = (usuarioId) => `usuario:${usuarioId}`

async function usuarioCompleto(usuarioId, transaction) {
    return Usuario.unscoped().findByPk(usuarioId, { transaction })
}

async function codigosRestantes(usuarioId, transaction) {
    return CodigoRecuperacion.count({ where: { usuario_id: usuarioId, usado_en: null }, transaction })
}

// Reemplaza los códigos de recuperación del usuario por unos nuevos y los devuelve (es la única vez que se ven).
async function nuevosCodigos(usuarioId, transaction) {
    const codigos = generarCodigos(CODIGOS_RECUPERACION)
    await CodigoRecuperacion.destroy({ where: { usuario_id: usuarioId }, transaction })
    await CodigoRecuperacion.bulkCreate(codigos.map((codigo) => ({ usuario_id: usuarioId, codigo_hash: hashCodigo(codigo) })), { transaction })
    return codigos
}

// Revisa un código (de la app o de recuperación) y, si sirve, lo deja "usado". Lanza 429 si el usuario está bloqueado
// y 400 si el código no sirve; con el quinto fallo el error lleva bloqueado = true.
// Devuelve { tipo: "app" | "recuperacion", codigosRestantes }.
async function consumirCodigo(usuario, codigo, { aceptaRecuperacion = true } = {}) {
    limite2fa.exigirPermitido(usuario.id)

    const resultado = await sequelize.transaction(async (transaction) => {
        // Se bloquea la fila del usuario: dos peticiones con el mismo código no pueden pasar las dos.
        const fila = await Usuario.unscoped().findByPk(usuario.id, { transaction, lock: transaction.LOCK.UPDATE })

        if (fila.totp_activo !== true || !fila.totp_secreto_cifrado) {
            throw new ConflictError("La verificación en dos pasos no está activa")
        }

        if (aceptaRecuperacion && pareceCodigoRecuperacion(codigo)) {
            const encontrado = await CodigoRecuperacion.findOne({
                where: { usuario_id: fila.id, codigo_hash: hashCodigo(codigo), usado_en: null },
                transaction, lock: transaction.LOCK.UPDATE
            })
            if (encontrado) {
                await encontrado.update({ usado_en: new Date() }, { transaction })
                return { tipo: "recuperacion", codigosRestantes: await codigosRestantes(fila.id, transaction) }
            }
            return null
        }

        const secreto = descifrar(fila.totp_secreto_cifrado, clave(), contexto(fila.id))
        const { valido, paso } = verificarTotp(secreto, codigo, Date.now(), fila.totp_ultimo_paso)
        if (!valido) {
            return null
        }
        await fila.update({ totp_ultimo_paso: paso }, { transaction })
        return { tipo: "app", codigosRestantes: await codigosRestantes(fila.id, transaction) }
    })

    if (resultado === null) {
        const bloqueado = limite2fa.registrarFallo(usuario.id)
        const error = new ValidationError(bloqueado
            ? "Demasiados códigos incorrectos. Vuelve a iniciar sesión en 15 minutos"
            : "El código no es correcto")
        error.bloqueado = bloqueado
        throw error
    }

    limite2fa.registrarExito(usuario.id)
    return resultado
}

async function estado(usuarioId) {
    const usuario = await usuarioCompleto(usuarioId)
    return {
        activo: usuario.totp_activo === true,
        activado_en: usuario.totp_activado_en,
        codigos_restantes: usuario.totp_activo === true ? await codigosRestantes(usuarioId) : 0
    }
}

// Paso 1 de la inscripción: un secreto nuevo (reemplaza uno a medio inscribir) y el QR para la app.
async function iniciarInscripcion(usuarioId) {
    const usuario = await usuarioCompleto(usuarioId)
    if (usuario.totp_activo === true) {
        throw new ConflictError("La verificación en dos pasos ya está activa")
    }

    const secreto = generarSecreto()
    await usuario.update({ totp_secreto_cifrado: cifrar(secreto, clave(), contexto(usuario.id)), totp_ultimo_paso: null })

    const uri = uriOtpauth(usuario.email, secreto)
    return { qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secreto: agruparSecreto(secreto), uri }
}

// Paso 2: el primer código de la app confirma que quedó bien inscrita. Devuelve los códigos de recuperación.
async function confirmarInscripcion(usuarioId, codigo) {
    limite2fa.exigirPermitido(usuarioId)

    const resultado = await sequelize.transaction(async (transaction) => {
        const usuario = await Usuario.unscoped().findByPk(usuarioId, { transaction, lock: transaction.LOCK.UPDATE })
        if (usuario.totp_activo === true) {
            throw new ConflictError("La verificación en dos pasos ya está activa")
        }
        if (!usuario.totp_secreto_cifrado) {
            throw new ConflictError("Primero genera el código QR")
        }

        const secreto = descifrar(usuario.totp_secreto_cifrado, clave(), contexto(usuario.id))
        const { valido, paso } = verificarTotp(secreto, codigo, Date.now(), usuario.totp_ultimo_paso)
        if (!valido) {
            return null
        }

        await usuario.update({ totp_activo: true, totp_activado_en: new Date(), totp_ultimo_paso: paso }, { transaction })
        return nuevosCodigos(usuario.id, transaction)
    })

    if (resultado === null) {
        limite2fa.registrarFallo(usuarioId)
        throw new ValidationError("El código no es correcto. Revisa que la hora del celular esté al día")
    }

    limite2fa.registrarExito(usuarioId)
    return resultado
}

// Códigos de recuperación nuevos (los anteriores dejan de servir). Pide un código válido.
async function regenerarCodigos(usuario, codigo) {
    await consumirCodigo(usuario, codigo)
    return sequelize.transaction((transaction) => nuevosCodigos(usuario.id, transaction))
}

// Quita el 2FA. Pide la contraseña y un código (de la app o de recuperación).
// Para quien lo tiene obligatorio sirve para cambiar de celular: al quedar sin 2FA, el sistema le pide inscribirlo de nuevo.
async function desactivar(usuarioId, password, codigo) {
    const usuario = await usuarioCompleto(usuarioId)
    if (usuario.totp_activo !== true) {
        throw new ConflictError("La verificación en dos pasos no está activa")
    }
    // La contraseña equivocada cuenta como intento fallido: esta ruta no debe servir para adivinarla.
    limite2fa.exigirPermitido(usuario.id)
    if (typeof password !== "string" || !(await bcrypt.compare(password, usuario.password_hash))) {
        limite2fa.registrarFallo(usuario.id)
        throw new ValidationError("La contraseña no es correcta")
    }

    await consumirCodigo(usuario, codigo)

    await sequelize.transaction(async (transaction) => {
        await usuario.update({ totp_activo: false, totp_activado_en: null, totp_secreto_cifrado: null, totp_ultimo_paso: null }, { transaction })
        await CodigoRecuperacion.destroy({ where: { usuario_id: usuario.id }, transaction })
    })
}

// Restablecer el acceso (admin de la cuenta, soporte o script): borra todo el 2FA del usuario.
// Se usa junto con la contraseña nueva y el cierre de sesiones, siempre en la misma operación.
async function borrarDosPasos(usuarioId, opciones = {}) {
    await Usuario.update(
        { totp_activo: false, totp_activado_en: null, totp_secreto_cifrado: null, totp_ultimo_paso: null },
        { where: { id: usuarioId }, ...opciones }
    )
    await CodigoRecuperacion.destroy({ where: { usuario_id: usuarioId }, ...opciones })
}

module.exports = {
    estado,
    iniciarInscripcion,
    confirmarInscripcion,
    consumirCodigo,
    regenerarCodigos,
    desactivar,
    borrarDosPasos
}
