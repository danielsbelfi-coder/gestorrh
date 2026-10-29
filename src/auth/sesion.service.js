// Sesiones guardadas en el servidor (reemplazan al JWT). Ver "Seguridad de acceso" en el SPEC.
const { Op } = require("sequelize")
const { Sesion, Usuario } = require("../shared/associations.js")
const { generarToken, hashToken, expiracionNueva, debeActualizarUltimoUso } = require("./reglas_sesion.js")
const { INACTIVIDAD_CLIENTE_MIN } = require("../shared/constantes.js")

function recortar(texto, largo) {
    return texto === undefined || texto === null ? null : String(texto).slice(0, largo)
}

// Crea la sesión y devuelve el identificador para la cookie (solo existe en esta respuesta: en la base queda su hash).
// Soporte y comercial tienen una sola sesión: al abrir una nueva, se cierran las demás.
async function crearSesion(usuario, { estado = "activa", ip, navegador } = {}, ahora = new Date()) {
    const token = generarToken()
    const csrfToken = generarToken()

    if (estado === "activa" && usuario.rol_plataforma) {
        await Sesion.destroy({ where: { usuario_id: usuario.id } })
    }

    const sesion = await Sesion.create({
        usuario_id: usuario.id,
        token_hash: hashToken(token),
        csrf_token: csrfToken,
        estado,
        expira_en: expiracionNueva(estado, ahora),
        ultimo_uso_en: ahora,
        ip: recortar(ip, 64),
        navegador: recortar(navegador, 255)
    })

    return { token, csrfToken, sesion }
}

// La sesión de un identificador de cookie, con su usuario. null si no existe.
async function buscarSesion(token) {
    if (!token) {
        return null
    }
    return Sesion.findOne({ where: { token_hash: hashToken(token) }, include: [Usuario] })
}

async function buscarYCerrarPorToken(token) {
    if (token) {
        await Sesion.destroy({ where: { token_hash: hashToken(token) } })
    }
}

async function cerrarSesion(sesionId) {
    await Sesion.destroy({ where: { id: sesionId } })
}

// Devuelve cuántas se cerraron.
async function cerrarOtrasSesiones(usuarioId, sesionActualId) {
    return Sesion.destroy({ where: { usuario_id: usuarioId, id: { [Op.ne]: sesionActualId } } })
}

// Para restablecer el acceso, desactivar un usuario o reiniciarlo por script.
async function cerrarTodasLasSesiones(usuarioId, opciones = {}) {
    return Sesion.destroy({ where: { usuario_id: usuarioId }, ...opciones })
}

// Identificador y token CSRF nuevos para la misma sesión (por ejemplo, al cambiar la contraseña):
// si alguien había copiado el identificador anterior, deja de servir.
async function rotarSesion(sesion) {
    const token = generarToken()
    const csrfToken = generarToken()
    await sesion.update({ token_hash: hashToken(token), csrf_token: csrfToken })
    return { token, csrfToken }
}

async function tocarSesion(sesion, ahora = new Date()) {
    if (debeActualizarUltimoUso(sesion, ahora)) {
        await sesion.update({ ultimo_uso_en: ahora })
    }
}

async function listarSesiones(usuarioId, sesionActualId) {
    const sesiones = await Sesion.findAll({
        where: { usuario_id: usuarioId, estado: "activa" },
        attributes: ["id", "createdAt", "ultimo_uso_en", "ip", "navegador"],
        order: [["ultimo_uso_en", "DESC"]]
    })
    return sesiones.map((sesion) => ({
        id: sesion.id,
        creada_en: sesion.createdAt,
        ultimo_uso_en: sesion.ultimo_uso_en,
        ip: sesion.ip,
        navegador: sesion.navegador,
        actual: sesion.id === sesionActualId
    }))
}

// Limpieza (scripts/eliminar-vencidos.js): sesiones que ya pasaron su máximo o el mayor tiempo de inactividad.
async function borrarSesionesVencidas(ahora = new Date(), { simular = false } = {}) {
    const limiteInactividad = new Date(ahora.getTime() - INACTIVIDAD_CLIENTE_MIN * 60 * 1000)
    const where = { [Op.or]: [{ expira_en: { [Op.lte]: ahora } }, { ultimo_uso_en: { [Op.lte]: limiteInactividad } }] }
    return simular ? Sesion.count({ where }) : Sesion.destroy({ where })
}

module.exports = {
    crearSesion,
    buscarSesion,
    buscarYCerrarPorToken,
    cerrarSesion,
    cerrarOtrasSesiones,
    cerrarTodasLasSesiones,
    rotarSesion,
    tocarSesion,
    listarSesiones,
    borrarSesionesVencidas
}
